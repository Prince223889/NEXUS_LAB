"""Tests du Studio APK : manifeste binaire, signature v1, fabrique, relais et routes HTTP.

    python3 -m unittest discover -s pi/tests

La fixture AndroidManifest.axml est le manifeste de mobile/ compilé par aapt (paquet local.nexus.lab).
Si `apksigner` est installé (apt install apksigner), un test fait vérifier l'APK par l'outil de Google.
"""
from __future__ import annotations

import base64
import hashlib
import importlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pi"))

from appstudio import apksign, forge  # noqa: E402
from appstudio.axml import ATTR, Manifest, StringPool, rebrand  # noqa: E402

FIX = Path(__file__).with_name("fixtures") / "AndroidManifest.axml"
PLAYER = ROOT / "mobile" / "app" / "src" / "main" / "assets" / "player"
HAS_OPENSSL = shutil.which("openssl") is not None


def design(**kw) -> dict:
    d = {"name": "Station météo", "icon": "🌦", "color": "#16a34a", "version": 4,
         "vars": [{"name": "temp", "source": "feed", "feed": "jardin/bme280_temp", "unit": "°C"},
                  {"name": "lampe", "type": "bool", "source": "local"},
                  {"name": "ip", "type": "text", "source": "local", "default": "192.168.4.20"}],
         "screens": [{"id": "accueil", "title": "Accueil", "items": [
             {"id": "c1", "type": "value", "var": "temp", "label": "Température"},
             {"id": "c2", "type": "switch", "label": "Lampe", "var": "lampe",
              "do": [{"a": "http", "url": "http://{ip}/set?lampe=1"}], "off": [{"a": "http", "url": "http://{ip}/set?lampe=0"}]},
             {"id": "c3", "type": "button", "text": "Réglages", "do": [{"a": "goto", "screen": "reglages"}]}]},
             {"id": "reglages", "title": "Réglages", "items": [{"id": "c4", "type": "input", "label": "IP", "var": "ip"}]}],
         "rules": [{"when": {"type": "above", "var": "temp", "value": "30"}, "do": [{"a": "speak", "text": "Il fait {temp} degrés"}]}]}
    d.update(kw)
    return d


def fake_base(path: Path) -> None:
    """APK de base minimale : vrai manifeste, lecteur, ressources non compressées, ancienne signature."""
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(zipfile.ZipInfo("AndroidManifest.xml"), FIX.read_bytes(), zipfile.ZIP_DEFLATED)
        z.writestr("classes.dex", b"dex\n035\x00" + bytes(200), zipfile.ZIP_DEFLATED)
        info = zipfile.ZipInfo("resources.arsc")
        z.writestr(info, bytes(range(256)) * 4, zipfile.ZIP_STORED)
        for f in ("index.html", "runtime.js"):
            z.writestr(f"assets/player/{f}", (PLAYER / f).read_bytes(), zipfile.ZIP_DEFLATED)
        z.writestr("META-INF/MANIFEST.MF", b"old")
        z.writestr("META-INF/CERT.SF", b"old")
        z.writestr("META-INF/CERT.RSA", b"old")


class AxmlTests(unittest.TestCase):
    def test_rebrand_keeps_activity_class(self):
        out = rebrand(FIX.read_bytes(), "local.nexus.apps.meteo", "Météo du jardin", 7, "7.0")
        m = Manifest(out)
        man, app, act = m.attributes("manifest"), m.attributes("application"), m.attributes("activity")
        self.assertEqual(man["package"], "local.nexus.apps.meteo")
        self.assertEqual(man[ATTR["versionCode"]], 7)
        self.assertEqual(man[ATTR["versionName"]], "7.0")
        self.assertEqual(app[ATTR["label"]], "Météo du jardin")
        self.assertEqual(act[ATTR["name"]], "local.nexus.lab.MainActivity")   # classe d'origine, nom complet

    def test_utf8_pool_roundtrip(self):
        m = Manifest(FIX.read_bytes())
        pool = m.pool
        pool.utf8, pool.flags = True, pool.flags | (1 << 8)
        again = StringPool(pool.encode())
        self.assertEqual(again.strings, pool.strings)
        self.assertTrue(again.utf8)

    def test_rejects_garbage(self):
        with self.assertRaises(ValueError):
            Manifest(b"PK\x03\x04 pas un manifeste")


class ValidateTests(unittest.TestCase):
    def test_valid_design(self):
        d = forge.validate(design())
        self.assertEqual(d["id"], "station_meteo")
        self.assertEqual(forge.package_name(d), "local.nexus.apps.station_meteo")

    def test_errors_are_explained(self):
        cases = [
            (design(name=""), "nom"),
            (design(screens=[]), "écran"),
            (design(vars=[{"name": "2x"}]), "variable"),
            (design(screens=[{"id": "a", "items": [{"id": "c1", "type": "value", "var": "absente"}]}]), "absente"),
            (design(screens=[{"id": "a", "items": [{"id": "c1", "type": "button", "do": [{"a": "goto", "screen": "zz"}]}]}]), "zz"),
            (design(screens=[{"id": "a", "items": [{"id": "c1", "type": "button", "do": [{"a": "http", "url": "file:///etc/passwd"}]}]}]), "http"),
            (design(screens=[{"id": "a", "items": [{"id": "c1", "type": "fusée"}]}]), "inconnu"),
        ]
        for d, word in cases:
            with self.assertRaises(forge.DesignError) as ctx:
                forge.validate(d)
            self.assertIn(word, str(ctx.exception).lower())

    def test_allowed_url(self):
        d = forge.validate(design(vars=design()["vars"] + [{"name": "t2", "source": "http", "url": "http://192.168.4.23/api", "path": "values.0"}]))
        self.assertTrue(forge.allowed_url(d, "http://192.168.4.31/set?lampe=1"))     # hôte variable {ip}, même chemin
        self.assertTrue(forge.allowed_url(d, "http://192.168.4.23/api"))
        self.assertFalse(forge.allowed_url(d, "http://192.168.4.31/reboot"))          # chemin non prévu
        self.assertFalse(forge.allowed_url(d, "http://8.8.8.8/set?lampe=1"))          # hors réseau local
        self.assertFalse(forge.allowed_url(d, "http://127.0.0.1:8088/set?x"))         # le Pi lui-même


@unittest.skipUnless(HAS_OPENSSL, "openssl absent")
class ForgeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.base = self.dir / "nexus-lab.apk"
        fake_base(self.base)

    def tearDown(self):
        self.tmp.cleanup()

    def build(self, use_apksigner=False):
        d = forge.validate(design())
        out = self.dir / "out.apk"
        res = forge.build(d, self.base, PLAYER, out, self.dir / "keys", use_apksigner=use_apksigner)
        return d, out, res

    def test_v1_signature_is_correct(self):
        d, out, res = self.build()
        self.assertEqual(res["package"], "local.nexus.apps.station_meteo")
        self.assertEqual(res["signature"], "v1")
        with zipfile.ZipFile(out) as z:
            names = z.namelist()
            self.assertNotIn("META-INF/1.SF", names)
            self.assertEqual(sum(n.startswith("META-INF/") for n in names), 3)
            app_js = z.read("assets/player/app.js").decode()
            self.assertIn('"name": "Station météo"', app_js)
            self.assertEqual(Manifest(z.read("AndroidManifest.xml")).attributes("manifest")["package"], res["package"])
            mf, sf, rsa = z.read("META-INF/MANIFEST.MF"), z.read("META-INF/CERT.SF"), z.read("META-INF/CERT.RSA")
            # chaque fichier est dans MANIFEST.MF avec le bon condensat
            sections = mf.split(b"\r\n\r\n")[1:-1]
            digests = {}
            for sec in sections:
                lines = sec.replace(b"\r\n ", b"").split(b"\r\n")
                attrs = dict(l.split(b": ", 1) for l in lines)
                digests[attrs[b"Name"].decode()] = attrs[b"SHA-256-Digest"]
            for n in names:
                if not n.startswith("META-INF/"):
                    self.assertEqual(digests[n], base64.b64encode(hashlib.sha256(z.read(n)).digest()), n)
            self.assertIn(b"SHA-256-Digest-Manifest: " + base64.b64encode(hashlib.sha256(mf).digest()), sf)
            # alignement 4 octets des entrées stockées (zipalign)
            for info in z.infolist():
                if info.compress_type == zipfile.ZIP_STORED:
                    with open(out, "rb") as f:
                        f.seek(info.header_offset + 26)
                        nlen, xlen = int.from_bytes(f.read(2), "little"), int.from_bytes(f.read(2), "little")
                    self.assertEqual((info.header_offset + 30 + nlen + xlen) % 4, 0, info.filename)
        # la signature PKCS#7 couvre CERT.SF et vient de la clé du labo
        (self.dir / "sf").write_bytes(sf)
        (self.dir / "rsa").write_bytes(rsa)
        v = subprocess.run(["openssl", "cms", "-verify", "-binary", "-inform", "DER", "-in", str(self.dir / "rsa"),
                            "-content", str(self.dir / "sf"), "-noverify", "-out", os.devnull], capture_output=True)
        self.assertEqual(v.returncode, 0, v.stderr)

    def test_same_key_for_updates(self):
        _, out1, r1 = self.build()
        fp1 = apksign.fingerprint(self.dir / "keys" / "nexus-apps.cert.pem")
        _, out2, r2 = self.build()
        self.assertEqual(fp1, apksign.fingerprint(self.dir / "keys" / "nexus-apps.cert.pem"))

    def test_old_base_is_refused(self):
        with zipfile.ZipFile(self.base, "w") as z:
            z.writestr("AndroidManifest.xml", FIX.read_bytes())
        with self.assertRaises(forge.DesignError) as ctx:
            self.build()
        self.assertIn("1.2", str(ctx.exception))

    @unittest.skipUnless(shutil.which("apksigner"), "apksigner absent")
    def test_google_apksigner_accepts_it(self):
        _, out, _ = self.build()
        v = subprocess.run(["apksigner", "verify", "--min-sdk-version", "24", str(out)], capture_output=True, text=True)
        self.assertEqual(v.returncode, 0, v.stderr + v.stdout)
        _, out, res = self.build(use_apksigner=True)
        self.assertEqual(res["signature"], "v2+v3")
        v = subprocess.run(["apksigner", "verify", "--min-sdk-version", "24", str(out)], capture_output=True, text=True)
        self.assertEqual(v.returncode, 0, v.stderr + v.stdout)


@unittest.skipUnless(HAS_OPENSSL, "openssl absent")
class AgentAppStudioHttpTests(unittest.TestCase):
    def test_save_build_download_webapp(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td) / "packages" / "nexus-lab.apk"
            base.parent.mkdir(parents=True)
            fake_base(base)
            env = {"NEXUS_DATA": td, "NEXUS_TOKEN": "t" * 40, "NEXUS_PROJECTS": str(Path(td) / "lib"), "NEXUS_FLEET_KEY": "",
                   "NEXUS_APK": str(base), "NEXUS_PLAYER": str(PLAYER), "NEXUS_APKSIGNER": "absent-volontairement"}
            old = {k: os.environ.get(k) for k in env}
            os.environ.update(env)
            try:
                sys.modules.pop("nexus_agent", None)
                agent = importlib.import_module("nexus_agent")
                for p in (agent.DATA, agent.PROJECTS, agent.APPS, agent.DB.parent):
                    p.mkdir(parents=True, exist_ok=True)
                agent.init()
                agent.APPCTX = agent.appstudio_api.Context(designs=agent.APPSTUDIO / "apps", apps=agent.APPS, keys=agent.APPSTUDIO / "keys",
                                                           base_apk=agent.BASE_APK, player=agent.PLAYER, record=agent.record_app_build)
                srv = agent.ThreadingHTTPServer(("127.0.0.1", 0), agent.Api)
                threading.Thread(target=srv.serve_forever, daemon=True).start()
                url = f"http://127.0.0.1:{srv.server_address[1]}"

                def call(path, body=None, token=True, raw=False):
                    req = urllib.request.Request(url + path, data=json.dumps(body).encode() if body is not None else None,
                                                 headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + "t" * 40} if token else {})},
                                                 method="POST" if body is not None else "GET")
                    try:
                        with urllib.request.urlopen(req, timeout=20) as r:
                            data = r.read()
                            return r.status, data if raw else json.loads(data)
                    except urllib.error.HTTPError as e:
                        data = e.read()
                        return e.code, data if raw else json.loads(data or b"{}")

                self.assertEqual(call("/api/v1/appstudio", token=False)[0], 401)
                st, s = call("/api/v1/appstudio")
                self.assertTrue(s["base"]["ok"], s)
                st, r = call("/api/v1/appstudio/apps", {"design": design(screens=[])})
                self.assertEqual(st, 400)
                self.assertIn("écran", r["error"])
                st, r = call("/api/v1/appstudio/apps", {"design": design()})
                self.assertEqual(st, 201)
                st, b = call("/api/v1/appstudio/apps/station_meteo/build", {})
                self.assertEqual(st, 201, b)
                self.assertEqual(b["signature"], "v1")
                st, apk = call(b["apk"], token=False, raw=True)          # lien direct, sans jeton
                self.assertEqual(st, 200)
                self.assertEqual(hashlib.sha256(apk).hexdigest(), b["sha256"])
                st, lst = call("/api/v1/appstudio/apps")
                self.assertEqual(lst["items"][0]["last_build"]["job"], b["job"])
                st, html = call("/apps/station_meteo/", token=False, raw=True)
                self.assertIn(b"<title>Station m\xc3\xa9t\xc3\xa9o</title>", html)
                st, js = call("/apps/station_meteo/app.js", token=False, raw=True)
                self.assertIn(b"window.NEXUS_APP", js)
                st, _ = call("/apps/station_meteo/proxy", {"method": "GET", "url": "http://192.168.4.20/reboot"}, token=False, raw=True)
                self.assertEqual(st, 403)
                st, _ = call("/apps/inconnue/", token=False, raw=True)
                self.assertEqual(st, 404)
                st, _ = call("/api/v1/appstudio/proxy", {"url": "http://example.com/"}, raw=True)
                self.assertEqual(st, 403)
                st, _ = call("/api/v1/appstudio/apps/station_meteo/delete", {})
                self.assertEqual(st, 200)
                # dépôt de l'APK de base : une APK sans lecteur est refusée, la bonne remplace l'actuelle
                def upload(data):
                    req = urllib.request.Request(url + "/api/v1/appstudio/base", data=data, method="POST",
                                                 headers={"Authorization": "Bearer " + "t" * 40, "Content-Type": "application/vnd.android.package-archive"})
                    try:
                        with urllib.request.urlopen(req, timeout=20) as r:
                            return r.status, json.loads(r.read())
                    except urllib.error.HTTPError as e:
                        return e.code, json.loads(e.read())
                old_base = Path(td) / "old.apk"
                with zipfile.ZipFile(old_base, "w") as z:
                    z.writestr("AndroidManifest.xml", FIX.read_bytes())
                    z.writestr("classes.dex", b"dex")
                st, r = upload(old_base.read_bytes())
                self.assertEqual(st, 400)
                self.assertIn("1.2", r["error"])
                self.assertEqual(upload(b"pas une apk")[0], 400)
                st, r = upload(base.read_bytes())
                self.assertEqual(st, 201, r)
                srv.shutdown()
                srv.server_close()
            finally:
                for k, v in old.items():
                    if v is None:
                        os.environ.pop(k, None)
                    else:
                        os.environ[k] = v


if __name__ == "__main__":
    unittest.main()
