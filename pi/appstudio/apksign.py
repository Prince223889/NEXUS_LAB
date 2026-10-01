"""Signature d'APK sur le Pi, sans SDK Android.

* Clé du labo : RSA 2048 auto-signée (openssl), gardée dans /srv/nexus/appstudio/keys. Toujours la même, pour que
  le téléphone accepte les mises à jour d'une application déjà installée.
* Signature v1 (JAR) écrite en Python : suffisante pour l'APK NEXUS (targetSdk 28) sur toutes les versions
  d'Android. Si `apksigner` est installé (apt install apksigner), il ajoute les signatures v2/v3.
* Alignement 4 octets des entrées non compressées (équivalent de zipalign).
"""
from __future__ import annotations

import base64
import hashlib
import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

SIG_FILES = (".SF", ".RSA", ".DSA", ".EC")
ALIGN_EXTRA_ID = 0xD935


class SignError(RuntimeError):
    pass


def _run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    try:
        p = subprocess.run(cmd, capture_output=True, timeout=180, **kw)
    except FileNotFoundError as e:
        raise SignError(f"Outil absent : {cmd[0]}") from e
    if p.returncode:
        raise SignError((p.stderr or p.stdout or b"").decode("utf-8", "replace").strip()[-400:] or f"{cmd[0]} a échoué")
    return p


def ensure_key(folder: Path) -> tuple[Path, Path]:
    folder.mkdir(parents=True, exist_ok=True)
    key, cert = folder / "nexus-apps.key.pem", folder / "nexus-apps.cert.pem"
    if not (key.is_file() and cert.is_file()):
        _run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "10950",
              "-subj", "/CN=NEXUS LAB Apps/O=NEXUS LAB", "-keyout", str(key), "-out", str(cert)])
        os.chmod(key, 0o600)
    return key, cert


def fingerprint(cert: Path) -> str:
    out = _run(["openssl", "x509", "-in", str(cert), "-noout", "-fingerprint", "-sha256"]).stdout.decode()
    return out.split("=", 1)[-1].strip()


def _attr(key: str, value: str) -> bytes:
    """Ligne de manifeste JAR : 72 octets maximum, suite sur les lignes suivantes précédées d'une espace."""
    raw = f"{key}: {value}".encode("utf-8")
    parts = [raw[:72]] + [b" " + raw[i:i + 71] for i in range(72, len(raw), 71)]
    return b"".join(p + b"\r\n" for p in parts)


def _b64(data: bytes) -> str:
    return base64.b64encode(hashlib.sha256(data).digest()).decode()


def is_signature_file(name: str) -> bool:
    up = name.upper()
    return up.startswith("META-INF/") and (up == "META-INF/MANIFEST.MF" or up.endswith(SIG_FILES))


def _write_aligned(z: zipfile.ZipFile, info: zipfile.ZipInfo, data: bytes) -> None:
    if info.compress_type == zipfile.ZIP_STORED:
        start = z.fp.tell() + 30 + len(info.filename.encode("utf-8"))
        pad = (-(start + 6)) % 4
        info.extra = ALIGN_EXTRA_ID.to_bytes(2, "little") + (2 + pad).to_bytes(2, "little") + (4).to_bytes(2, "little") + b"\x00" * pad
    else:
        info.extra = b""
    z.writestr(info, data)


def write_v1(entries: list[tuple[zipfile.ZipInfo, bytes]], out: Path, key: Path, cert: Path) -> None:
    """Écrit l'APK signée v1. `entries` = contenu sans aucun fichier de signature."""
    mf = bytearray(_attr("Manifest-Version", "1.0") + _attr("Created-By", "NEXUS LAB Studio APK") + b"\r\n")
    sections = []
    for info, data in entries:
        sec = _attr("Name", info.filename) + _attr("SHA-256-Digest", _b64(data)) + b"\r\n"
        mf += sec
        sections.append((info.filename, sec))
    sf = bytearray(_attr("Signature-Version", "1.0") + _attr("Created-By", "NEXUS LAB Studio APK")
                   + _attr("SHA-256-Digest-Manifest", _b64(bytes(mf))) + b"\r\n")
    for name, sec in sections:
        sf += _attr("Name", name) + _attr("SHA-256-Digest", _b64(sec)) + b"\r\n"
    with tempfile.TemporaryDirectory() as tmp:
        sf_path, sig_path = Path(tmp, "CERT.SF"), Path(tmp, "CERT.RSA")
        sf_path.write_bytes(bytes(sf))
        _run(["openssl", "cms", "-sign", "-binary", "-noattr", "-nosmimecap", "-md", "sha256", "-outform", "DER",
              "-signer", str(cert), "-inkey", str(key), "-in", str(sf_path), "-out", str(sig_path)])
        signature = sig_path.read_bytes()
    tmp_out = out.with_name(out.name + ".part")
    with zipfile.ZipFile(tmp_out, "w") as z:
        for name, data in (("META-INF/MANIFEST.MF", bytes(mf)), ("META-INF/CERT.SF", bytes(sf)), ("META-INF/CERT.RSA", signature)):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            _write_aligned(z, info, data)
        for info, data in entries:
            _write_aligned(z, info, data)
    tmp_out.replace(out)


def apksigner_path() -> str | None:
    return shutil.which(os.getenv("NEXUS_APKSIGNER", "apksigner"))


def sign_v2(apk: Path, key: Path, cert: Path) -> None:
    """Ajoute v2/v3 avec apksigner (si installé), avec la même clé que la v1."""
    signer = apksigner_path()
    if not signer:
        raise SignError("apksigner absent")
    with tempfile.TemporaryDirectory() as tmp:
        ks = Path(tmp, "nexus.p12")
        password = base64.urlsafe_b64encode(os.urandom(18)).decode()
        env = dict(os.environ, NEXUS_KS_PASS=password)
        _run(["openssl", "pkcs12", "-export", "-inkey", str(key), "-in", str(cert), "-name", "nexus",
              "-passout", "env:NEXUS_KS_PASS", "-out", str(ks)], env=env)
        signed = Path(tmp, "signed.apk")
        _run([signer, "sign", "--ks", str(ks), "--ks-type", "PKCS12", "--ks-pass", "env:NEXUS_KS_PASS",
              "--min-sdk-version", "24", "--in", str(apk), "--out", str(signed)], env=env)
        shutil.move(str(signed), apk)
