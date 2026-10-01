#!/usr/bin/env python3
"""ESP32 LAB — fabrique l'archive de distribution et les empreintes.

    python scripts/make_release.py [--master-bin firmware/master/build/esp32_lab_master.bin] [--url-base https://…/]

Produit dist/ESP32_LAB_v<version>.zip, dist/SHA256SUMS.txt et, si un binaire MASTER est fourni,
dist/manifest.json prêt pour la mise à jour OTA par Internet."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXCLUDE_DIRS = {"build", "dist", ".pio", "managed_components", "__pycache__", ".git", "node_modules"}
EXCLUDE_FILES = {"sdkconfig", "sdkconfig.old", "dependencies.lock"}


def sha256(p: pathlib.Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--master-bin", type=pathlib.Path)
    ap.add_argument("--url-base", default="https://exemple.org/esp32lab/")
    a = ap.parse_args()
    version = (ROOT / "firmware" / "master" / "version.txt").read_text().strip()
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    name = f"ESP32_LAB_v{version}"
    zpath = dist / f"{name}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(ROOT.rglob("*")):
            rel = p.relative_to(ROOT)
            if any(part in EXCLUDE_DIRS for part in rel.parts) or p.name in EXCLUDE_FILES or p.is_dir():
                continue
            z.write(p, f"{name}/{rel.as_posix()}")
    sums = [f"{sha256(zpath)}  {zpath.name}"]
    if a.master_bin and a.master_bin.exists():
        h = sha256(a.master_bin)
        sums.append(f"{h}  {a.master_bin.name}")
        (dist / "manifest.json").write_text(json.dumps({"version": version, "master_url": a.url_base.rstrip("/") + "/" + a.master_bin.name,
                                                        "master_sha256": h, "notes": f"ESP32 LAB {version}"}, indent=2) + "\n", encoding="utf-8")
    (dist / "SHA256SUMS.txt").write_text("\n".join(sums) + "\n", encoding="utf-8")
    print(f"{zpath} ({zpath.stat().st_size // 1024} Ko)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
