"""Tests de l'analyse et de la correction des projets Arduino (aucune compilation).

    python3 -m unittest discover -s pi/tests -v
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pi"))

from patricia import analyzer  # noqa: E402

CLEAN = """// Clignotement propre
#include <WiFi.h>
#define LED 4

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  WiFi.begin("MonReseau", "motdepasse");
}

void loop() {
  digitalWrite(LED, HIGH);
  Serial.println("ok");
  delay(500);
}
"""


class AnalyzerTestCase(unittest.TestCase):
    def setUp(self):
        self._td = tempfile.TemporaryDirectory()
        self.base = Path(self._td.name)

    def tearDown(self):
        self._td.cleanup()

    def project(self, code: str, name: str = "proj", extra: dict | None = None, meta: dict | None = None) -> Path:
        d = self.base / name
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{name}.ino").write_text(code, encoding="utf-8")
        for fname, text in (extra or {}).items():
            (d / fname).parent.mkdir(parents=True, exist_ok=True)
            (d / fname).write_text(text, encoding="utf-8")
        if meta is not None:
            (d / "project.json").write_text(json.dumps(meta), encoding="utf-8")
        return d

    def ids(self, d: Path, **kw) -> dict:
        return {f["id"]: f for f in analyzer.analyze_project(d, **kw)["findings"]}

    def sketch(self, setup_body: str = "", loop_body: str = "", head: str = "") -> str:
        return f"{head}\nvoid setup() {{\n{setup_body}\n}}\n\nvoid loop() {{\n{loop_body}\n}}\n"


class CleanAndShapeTests(AnalyzerTestCase):
    def test_clean_sketch_scores_100(self):
        d = self.project(CLEAN, meta={"board": "esp32s3"})
        r = analyzer.analyze_project(d)
        self.assertEqual(r["findings"], [], r["findings"])
        self.assertEqual(r["score"], 100)
        self.assertEqual(r["board"], "esp32s3")
        self.assertEqual(r["project"], "proj")
        self.assertEqual(r["files"], ["proj.ino"])
        self.assertIn("aucun problème", r["summary"])

    def test_board_resolution(self):
        d = self.project(CLEAN, meta={"spec": {"board": "esp32:esp32:esp32c3"}})
        self.assertEqual(analyzer.analyze_project(d)["board"], "esp32c3")
        self.assertEqual(analyzer.analyze_project(d, board="esp32")["board"], "esp32")
        d2 = self.project(CLEAN, name="nometa")
        self.assertEqual(analyzer.analyze_project(d2)["board"], "esp32")

    def test_finding_shape_and_score(self):
        d = self.project(self.sketch("", 'Serial.println("x");'))
        r = analyzer.analyze_project(d)
        f = r["findings"][0]
        for k in ("id", "severity", "title", "explanation", "file", "line", "fixable", "fix_summary"):
            self.assertIn(k, f)
        self.assertEqual(f["id"], "missing-serial-begin:proj.ino")
        self.assertEqual(f["line"], 7)
        self.assertLess(r["score"], 100)

    def test_comments_and_strings_ignored(self):
        code = self.sketch('// Serial.println("x");\n/* digitalWrite(5, HIGH); */\nconst char* s = "Wire.begin(); WiFi.begin(";')
        self.assertEqual(self.ids(self.project(code)), {})


class CheckTests(AnalyzerTestCase):
    def test_missing_serial_begin(self):
        self.assertIn("missing-serial-begin:proj.ino", self.ids(self.project(self.sketch("", 'Serial.print(1);'))))

    def test_missing_pinmode_literal_define_and_const(self):
        code = self.sketch("pinMode(5, OUTPUT);", "digitalWrite(2, HIGH);\ndigitalWrite(RELAY, LOW);\nanalogWrite(BUZ, 10);\ndigitalWrite(5, LOW);",
                           head="#define RELAY 26\nconst int BUZ = 27;")
        ids = self.ids(self.project(code))
        self.assertIn("missing-pinmode:2:proj.ino", ids)
        self.assertIn("missing-pinmode:RELAY:proj.ino", ids)
        self.assertIn("missing-pinmode:BUZ:proj.ino", ids)
        self.assertFalse(any(i.startswith("missing-pinmode:5") for i in ids))
        self.assertTrue(ids["missing-pinmode:RELAY:proj.ino"]["fixable"])

    def test_pinmode_in_loop_is_not_flagged(self):
        code = self.sketch("for (int i = 0; i < 3; i++) pinMode(pins[i], OUTPUT);", "digitalWrite(4, HIGH);",
                           head="int pins[] = {4, 5, 13};")
        self.assertFalse(any(i.startswith("missing-pinmode") for i in self.ids(self.project(code))))

    def test_missing_ledc_attach(self):
        ids = self.ids(self.project(self.sketch("", "ledcWrite(13, 100);")))
        self.assertIn("missing-ledcattach:13:proj.ino", ids)
        self.assertNotIn("missing-ledcattach:13:proj.ino", self.ids(self.project(self.sketch("ledcAttach(13, 5000, 8);", "ledcWrite(13, 100);"), name="ok")))

    def test_missing_includes(self):
        code = self.sketch("dht.begin();\nWire.begin();\nWiFi.begin(\"Lab\", \"x\");\nservo.attach(13);\nstrip.begin();\nsensors.begin();\nlcd.init();\ndisplay.begin(SSD1306_SWITCHCAPVCC, 0x3C);",
                           head="DHT dht(4, DHT22);\nServo servo;\nAdafruit_NeoPixel strip(8, 5, NEO_GRB);\nOneWire ow(14);\nDallasTemperature sensors(&ow);\nLiquidCrystal_I2C lcd(0x27, 16, 2);\nAdafruit_SSD1306 display(128, 64, &Wire, -1);")
        ids = self.ids(self.project(code))
        for h in ("DHT.h", "Wire.h", "WiFi.h", "ESP32Servo.h", "Adafruit_NeoPixel.h", "OneWire.h", "DallasTemperature.h",
                  "LiquidCrystal_I2C.h", "Adafruit_SSD1306.h"):
            self.assertIn(f"missing-include:{h}:proj.ino", ids, h)
        self.assertIn("Adafruit_GFX.h", ids["missing-include:Adafruit_SSD1306.h:proj.ino"]["fix_summary"])

    def test_include_suppressed_by_providing_library(self):
        code = self.sketch("Wire.begin();\nWiFi.begin(\"Lab\", \"x\");", head="#include <LiquidCrystal_I2C.h>\n#include <WebServer.h>")
        ids = self.ids(self.project(code))
        self.assertNotIn("missing-include:Wire.h:proj.ino", ids)
        self.assertNotIn("missing-include:WiFi.h:proj.ino", ids)

    def test_cpp_needs_arduino_h(self):
        d = self.project(CLEAN, extra={"helper.cpp": "void blink() { digitalWrite(4, LOW); }\n"})
        self.assertIn("missing-include:Arduino.h:helper.cpp", self.ids(d))

    def test_servo_header_on_esp32(self):
        ids = self.ids(self.project(self.sketch("s.attach(13);", head="#include <Servo.h>\nServo s;")))
        self.assertIn("servo-header:proj.ino", ids)
        self.assertNotIn("missing-include:ESP32Servo.h:proj.ino", ids)

    def test_missing_wire_begin(self):
        ids = self.ids(self.project(self.sketch("", "Wire.beginTransmission(0x3C);\nWire.endTransmission();", head="#include <Wire.h>")))
        self.assertIn("missing-wire-begin:proj.ino", ids)

    def test_missing_setup_and_loop(self):
        ids = self.ids(self.project("#include <Arduino.h>\nvoid setup() {\n}\n"))
        self.assertTrue(ids["missing-loop:proj.ino"]["fixable"])
        ids = self.ids(self.project("int x = 1;\n", name="vide"))
        self.assertIn("missing-setup:vide.ino", ids)
        self.assertFalse(ids["missing-loop:vide.ino"]["fixable"])

    def test_ledc_old_api_fixable_and_ambiguous(self):
        code = self.sketch("ledcSetup(0, 5000, 8);\nledcAttachPin(18, 0);", "ledcWrite(0, 128);")
        f = self.ids(self.project(code))["ledc-api-v3:proj.ino"]
        self.assertTrue(f["fixable"])
        self.assertEqual(f["severity"], "bad")
        amb = self.sketch("ledcSetup(0, 5000, 8);\nledcAttachPin(18, 0);\nledcAttachPin(19, 0);", "ledcWrite(0, 128);")
        f = self.ids(self.project(amb, name="amb"))["ledc-api-v3:amb.ino"]
        self.assertFalse(f["fixable"])
        self.assertIn("plusieurs broches", f["explanation"])

    def test_pins_esp32(self):
        code = self.sketch("pinMode(6, OUTPUT);\npinMode(35, OUTPUT);\npinMode(12, OUTPUT);\npinMode(40, INPUT);",
                           "WiFi.begin(\"Lab\", \"x\");\nint v = analogRead(25);\nint w = analogRead(34);",
                           head="#include <WiFi.h>")
        ids = self.ids(self.project(code))
        self.assertEqual(ids["pin-flash:6"]["severity"], "bad")
        self.assertEqual(ids["pin-input-only:35"]["severity"], "bad")
        self.assertEqual(ids["pin-strapping:12"]["severity"], "warn")
        self.assertEqual(ids["pin-invalid:40"]["severity"], "bad")
        self.assertEqual(ids["pin-adc2-wifi:25"]["severity"], "bad")
        self.assertNotIn("pin-adc2-wifi:34", ids)
        self.assertNotIn("pin-input-only:34", ids)

    def test_boot_button_is_not_a_strapping_warning(self):
        code = self.sketch("pinMode(0, INPUT_PULLUP);", "if (digitalRead(0) == LOW) {}")
        self.assertNotIn("pin-strapping:0", self.ids(self.project(code)))
        self.assertIn("pin-strapping:0", self.ids(self.project(self.sketch("pinMode(0, OUTPUT);"), name="out")))

    def test_adc2_without_wifi_is_fine(self):
        self.assertNotIn("pin-adc2-wifi:25", self.ids(self.project(self.sketch("", "int v = analogRead(25);"))))

    def test_pins_other_boards(self):
        code = self.sketch("pinMode(40, OUTPUT);\npinMode(46, OUTPUT);\npinMode(23, OUTPUT);")
        ids = self.ids(self.project(code), board="esp32s3")
        self.assertNotIn("pin-invalid:40", ids)
        self.assertIn("pin-strapping:46", ids)
        self.assertIn("pin-invalid:23", ids)
        ids = self.ids(self.project(code, name="c3"), board="esp32c3")
        self.assertIn("pin-invalid:40", ids)
        ids = self.ids(self.project(self.sketch("pinMode(9, INPUT);\npinMode(14, OUTPUT);"), name="c3b"), board="esp32c3")
        self.assertIn("pin-strapping:9", ids)
        self.assertIn("pin-flash:14", ids)

    def test_local_loop_variable_not_a_pin(self):
        code = self.sketch("for (int i = 0; i < 3; i++) { pinMode(i, OUTPUT); }")
        self.assertFalse(any(i.startswith("pin-") for i in self.ids(self.project(code))))

    def test_blocking_delay_with_web_server(self):
        code = self.sketch("server.begin();", "server.handleClient();\ndelay(2000);", head="#include <WebServer.h>\nWebServer server(80);")
        self.assertIn("blocking-delay:proj.ino", self.ids(self.project(code)))
        code2 = self.sketch("", "delay(2000);")
        self.assertNotIn("blocking-delay:proj2.ino", self.ids(self.project(code2, name="proj2")))

    def test_unbalanced(self):
        ids = self.ids(self.project("void setup() {\n  if (1) {\n}\n\nvoid loop() {\n}\n"))
        self.assertEqual(ids["unbalanced-braces:proj.ino"]["severity"], "bad")
        self.assertEqual(ids["unbalanced-braces:proj.ino"]["line"], 1)
        ids = self.ids(self.project("void setup() {\n  delay((10);\n}\nvoid loop() {}\n", name="par"))
        self.assertIn("unbalanced-parens:par.ino", ids)
        ids = self.ids(self.project("void setup() {\n}\n}\nvoid loop() {}\n", name="extra"))
        self.assertEqual(ids["unbalanced-braces:extra.ino"]["line"], 3)

    def test_wifi_placeholder(self):
        ids = self.ids(self.project(self.sketch('WiFi.begin("your_ssid", "pw");', head="#include <WiFi.h>")))
        self.assertIn("wifi-placeholder:proj.ino", ids)
        ids = self.ids(self.project(self.sketch("WiFi.begin(ssid, pw);", head='#include <WiFi.h>\nconst char* ssid = "SSID";\nconst char* pw = "x";'), name="v"))
        self.assertIn("wifi-placeholder:v.ino", ids)
        ids = self.ids(self.project(self.sketch('WiFi.begin("", "pw");', head="#include <WiFi.h>"), name="e"))
        self.assertIn("wifi-placeholder:e.ino", ids)

    def test_hardcoded_secrets(self):
        code = self.sketch("", head='const char* tok = "ghp_' + "a1B2" * 9 + '";\nconst char* apiKey = "a8f9b7c6d5e4f3a2b1c0d9e8";\nconst char* pass = "motdepasse";\nconst char* WIFI_PASS = "ESP32-LAB-Setup2026!";')
        ids = self.ids(self.project(code))
        secrets = [i for i in ids if i.startswith("hardcoded-secret")]
        self.assertEqual(len(secrets), 2, secrets)
        self.assertNotIn("a1B2a1B2", json.dumps(list(ids.values())))

    def test_build_log_merge(self):
        d = self.project(CLEAN)
        log = ("/srv/x/proj/proj.ino:12:3: error: 'DHT' does not name a type\n"
               "/srv/x/proj/proj.ino:1:10: fatal error: BH1750.h: No such file or directory\n")
        ids = self.ids(d, build_log=log)
        self.assertTrue(ids["missing-include:DHT.h:proj.ino"]["fixable"])
        self.assertIn("missing-library:BH1750.h", ids)
        self.assertFalse(ids["missing-library:BH1750.h"]["fixable"])
        self.assertEqual(ids["missing-library:BH1750.h"]["action"]["library"], "BH1750")
        r = analyzer.apply_fixes(d, ["missing-include:DHT.h:proj.ino"], build_log=log)
        self.assertEqual(r["applied"], ["missing-include:DHT.h:proj.ino"])
        self.assertIn("#include <DHT.h>", (d / "proj.ino").read_text())

    def test_build_log_dedup_with_static(self):
        d = self.project(self.sketch("dht.begin();", head="DHT dht(4, DHT22);"))
        log = "/srv/x/proj/proj.ino:2:1: error: 'DHT' does not name a type\n"
        ids = self.ids(d, build_log=log)
        self.assertEqual(len([i for i in ids if "DHT.h" in i]), 1)


BUGGY = """// Démo buggée
#define LED 4
const int CH = 0;
DHT dht(15, DHT22);
void setup() {
  ledcSetup(CH, 5000, 8);
  ledcAttachPin(18, CH);
  dht.begin();
}

void loop() {
  Serial.println("salut");
  digitalWrite(LED, HIGH);
  ledcWrite(CH, 128);
  Wire.beginTransmission(0x3C);
  delay(200);
}
"""


class FixTests(AnalyzerTestCase):
    def test_apply_all_and_idempotent(self):
        d = self.project(BUGGY)
        before = analyzer.analyze_project(d)
        fixable = {f["id"] for f in before["findings"] if f["fixable"]}
        self.assertTrue({"missing-include:DHT.h:proj.ino", "ledc-api-v3:proj.ino", "missing-pinmode:LED:proj.ino",
                         "missing-serial-begin:proj.ino", "missing-wire-begin:proj.ino", "missing-include:Wire.h:proj.ino"} <= fixable)
        r = analyzer.apply_fixes(d)
        self.assertEqual(set(r["applied"]), fixable)
        self.assertEqual(r["changed_files"], ["proj.ino"])
        self.assertTrue(r["backup"].startswith(".patricia_backup/"))
        text = (d / "proj.ino").read_text()
        setup = text[text.index("void setup() {"):]
        self.assertTrue(setup.split("\n")[1].strip() == "Serial.begin(115200);", setup)
        self.assertIn("ledcAttach(18, 5000, 8);", text)
        self.assertIn("ledcWrite(18, 128);", text)
        self.assertNotIn("ledcSetup", text)
        self.assertIn("pinMode(LED, OUTPUT);", text)
        self.assertIn("Wire.begin();", text)
        after = analyzer.analyze_project(d)
        self.assertFalse(any(f["fixable"] for f in after["findings"]), after["findings"])
        self.assertGreater(after["score"], before["score"])
        again = analyzer.apply_fixes(d)
        self.assertEqual(again["applied"], [])
        self.assertIsNone(again["backup"])
        self.assertEqual((d / "proj.ino").read_text(), text)

    def test_apply_selected_and_skipped(self):
        d = self.project(BUGGY)
        r = analyzer.apply_fixes(d, ["missing-serial-begin:proj.ino", "pin-strapping:15", "nope"])
        self.assertEqual(r["applied"], ["missing-serial-begin:proj.ino"])
        self.assertEqual({s["id"] for s in r["skipped"]}, {"pin-strapping:15", "nope"})
        ids = self.ids(d)
        self.assertNotIn("missing-serial-begin:proj.ino", ids)
        self.assertIn("missing-pinmode:LED:proj.ino", ids)

    def test_add_loop_and_empty_setup_body(self):
        d = self.project("void setup() {}\nint v = 0;\n")
        r = analyzer.apply_fixes(d)
        self.assertIn("missing-loop:proj.ino", r["applied"])
        self.assertEqual(self.ids(d), {})
        d2 = self.project("void setup() {}\nvoid loop() { Serial.println(1); }\n", name="inline")
        analyzer.apply_fixes(d2)
        self.assertIn("void setup() {\n  Serial.begin(115200);\n}", (d2 / "inline.ino").read_text())
        self.assertEqual(self.ids(d2), {})

    def test_servo_and_arduino_h_fixes(self):
        d = self.project(self.sketch("s.attach(13);", head="#include <Servo.h>\nServo s;"),
                         extra={"helper.cpp": "// aide\nvoid blink() { digitalWrite(4, LOW); }\n", "helper.h": "#pragma once\nvoid blink();\n"})
        r = analyzer.apply_fixes(d)
        self.assertIn("servo-header:proj.ino", r["applied"])
        self.assertIn("missing-include:Arduino.h:helper.cpp", r["applied"])
        self.assertIn("#include <ESP32Servo.h>", (d / "proj.ino").read_text())
        self.assertEqual((d / "helper.cpp").read_text(), "// aide\n#include <Arduino.h>\nvoid blink() { digitalWrite(4, LOW); }\n")

    def test_backup_and_restore(self):
        d = self.project(BUGGY)
        r = analyzer.apply_fixes(d)
        bdir = d / r["backup"]
        self.assertEqual((bdir / "proj.ino").read_text(), BUGGY)
        self.assertNotEqual((d / "proj.ino").read_text(), BUGGY)
        self.assertEqual(analyzer.list_backups(d), [bdir.name])
        res = analyzer.restore_backup(d)
        self.assertTrue(res["ok"])
        self.assertEqual(res["files"], ["proj.ino"])
        self.assertEqual((d / "proj.ino").read_text(), BUGGY)
        r2 = analyzer.apply_fixes(d)
        self.assertNotEqual(r2["backup"], r["backup"])
        self.assertTrue(analyzer.restore_backup(d, bdir.name)["ok"])
        self.assertEqual((d / "proj.ino").read_text(), BUGGY)
        self.assertFalse(analyzer.restore_backup(d, "../../etc")["ok"])
        self.assertFalse(analyzer.restore_backup(self.project(CLEAN, name="nob"))["ok"])
        # la sauvegarde n'est pas analysée comme du code du projet
        self.assertEqual(analyzer.analyze_project(d)["files"], ["proj.ino"])


@unittest.skipIf(os.name == "nt", "liens symboliques POSIX")
class SafetyTests(AnalyzerTestCase):
    def test_symlinks_are_not_followed(self):
        outside = self.base / "outside"
        outside.mkdir()
        victim = outside / "victim.ino"
        victim.write_text("void loop() { Serial.println(1); }\n")
        (outside / "sub").mkdir()
        (outside / "sub" / "deep.h").write_text("void x() { Serial.println(1); }\n")
        d = self.project(self.sketch("", "Serial.println(1);"))
        os.symlink(victim, d / "link.ino")
        os.symlink(outside / "sub", d / "linkdir")
        r = analyzer.analyze_project(d)
        self.assertEqual(r["files"], ["proj.ino"])
        analyzer.apply_fixes(d)
        self.assertEqual(victim.read_text(), "void loop() { Serial.println(1); }\n")
        self.assertEqual((outside / "sub" / "deep.h").read_text(), "void x() { Serial.println(1); }\n")
        self.assertIn("Serial.begin", (d / "proj.ino").read_text())

    def test_symlinked_backup_dir_refused(self):
        outside = self.base / "outside2"
        outside.mkdir()
        d = self.project(self.sketch("", "Serial.println(1);"))
        os.symlink(outside, d / ".patricia_backup")
        with self.assertRaises(PermissionError):
            analyzer.apply_fixes(d)
        self.assertEqual(list(outside.iterdir()), [])
        self.assertNotIn("Serial.begin", (d / "proj.ino").read_text())

    def test_large_and_foreign_files_skipped(self):
        d = self.project(CLEAN, extra={"big.h": "// x\n" * 200000, "notes.txt": "Serial.println(1);", "src/util.h": "#pragma once\n"})
        files = analyzer.analyze_project(d)["files"]
        self.assertNotIn("big.h", files)
        self.assertNotIn("notes.txt", files)
        self.assertIn("src/util.h", files)

    def test_tampered_manifest_cannot_escape(self):
        outside = self.base / "victim.ino"
        outside.write_text("original")
        d = self.project(BUGGY)
        r = analyzer.apply_fixes(d)
        man = d / r["backup"] / "manifest.json"
        man.write_text(json.dumps({"files": ["../victim.ino", "/etc/passwd", "proj.ino"]}))
        res = analyzer.restore_backup(d)
        self.assertEqual(res["files"], ["proj.ino"])
        self.assertEqual(outside.read_text(), "original")

    def test_missing_dir(self):
        with self.assertRaises(FileNotFoundError):
            analyzer.analyze_project(self.base / "absent")


if __name__ == "__main__":
    unittest.main()
