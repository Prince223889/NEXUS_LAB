"""Tests de Patricia et du superviseur de flotte (aucun matériel, aucune compilation).

    python3 -m unittest discover -s pi/tests -v
"""
from __future__ import annotations

import base64
import importlib
import json
import math
import os
import random
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pi"))

from patricia import diagnose as diag  # noqa: E402
from patricia.engine import Engine  # noqa: E402
from patricia.fleet import Arena, Fleet, SimTransport, astar  # noqa: E402
from patricia.fleet_net import decode, encode, mac  # noqa: E402
from patricia.intents import detect, workers_in  # noqa: E402
from patricia.knowledge import Knowledge  # noqa: E402
from patricia.memory import Memory  # noqa: E402

CATALOG = ROOT / "catalog" / "catalog.json"


class FakeFleetService:
    def __init__(self, fleet):
        self.fleet = fleet

    def snapshot(self):
        s = self.fleet.snapshot()
        s["enabled"] = True
        s["announced"] = []
        return s


class FakeHost:
    def __init__(self, fleet=None):
        self.fleet = FakeFleetService(fleet) if fleet else None
        self.builds = []

    def queue_build(self, pid, board):
        self.builds.append((pid, board))
        return {"id": "job1", "status": "queued"}

    def queue_apk(self, pid):
        raise ValueError("ARM64")

    def user_projects(self):
        return []

    def recent_builds(self):
        return []

    def install_library(self, name):
        return {"installed": name}


def new_engine(tmp, fleet=None):
    return Engine(Memory(Path(tmp) / "m.sqlite3"), Knowledge(CATALOG), FakeHost(fleet), lambda: {})


class MemoryTests(unittest.TestCase):
    def test_notes_projects_facts_search(self):
        with tempfile.TemporaryDirectory() as td:
            m = Memory(Path(td) / "m.sqlite3")
            n = m.add_note("Le capteur de sol mesure 1200 à sec et 650 dans l'eau", tags=["soil_cap"])
            self.assertEqual(n["tags"], ["soil_cap"])
            p = m.upsert_project("Serre connectée", goal="arroser les tomates", modules=["soil_cap"])
            self.assertEqual(p["id"], "serre_connectee")
            m.project_log(p["id"], "câblage vérifié")
            self.assertEqual(m.project(p["id"])["log"][-1]["text"], "câblage vérifié")
            m.remember("Prénom", "Aboubacar")
            self.assertEqual(m.facts()["prenom"], "Aboubacar")
            kinds = {h["kind"] for h in m.search("capteur sol eau")}
            self.assertIn("note", kinds)
            self.assertEqual(m.find_project("comment va la serre ?")["id"], "serre_connectee")
            m.add_followup("On améliore ?", 0, p["id"], ["Oui"])
            m.add_followup("On améliore ?", 0, p["id"], ["Oui"])
            self.assertEqual(len(m.due_followups()), 1)
            b = m.backup(Path(td) / "bk")
            self.assertTrue(b.exists() and b.stat().st_size > 0)
            self.assertTrue(m.delete_note(n["id"]))
            self.assertEqual(m.stats()["notes"], 0)

    def test_action_lifecycle(self):
        with tempfile.TemporaryDirectory() as td:
            m = Memory(Path(td) / "m.sqlite3")
            a = m.propose_action("build", {"project": "x"}, "Compiler x", "faible", ttl_s=-1)
            self.assertTrue(m.action(a["id"])["expired"])


class IntentTests(unittest.TestCase):
    def test_intents(self):
        cases = {
            "Bonjour Patricia": "greet",
            "note que la batterie tient 3 jours": "note_add",
            "flashe le worker 3 avec la station météo": "flash",
            "avance la voiture 2 de 50 cm": "drive",
            "toutes les voitures en ligne": "drive",
            "STOP": "estop",
            "arrête tout !": "estop",
            "lance un check-up du worker 4": "job",
            "je veux faire une station météo avec un BME280": "project_new",
            "comment brancher un HC-SR04 ?": "wiring",
            "mes projets": "project_list",
            "état du labo": "status",
            "Guru Meditation Error: Core  1 panic'ed (LoadProhibited)": "diagnose",
            "je m'appelle Aboubacar": "fact_set",
            "crée l'apk de la serre": "apk",
            "quelle est la température ?": "sensors",
            "lis les capteurs du worker 2": "sensors",
            "comment brancher un capteur de température ?": "wiring",
        }
        for text, want in cases.items():
            self.assertEqual(detect(text).name, want, text)

    def test_slots(self):
        self.assertEqual(workers_in("les voitures 1, 2 et 5"), [1, 2, 5])
        self.assertEqual(workers_in("worker trois"), [3])
        i = detect("avance la voiture 2 de 50 cm")
        self.assertEqual(i.slots["distance_m"], 0.5)
        self.assertEqual(i.slots["direction"], "avance")
        self.assertEqual(detect("compile le projet serre pour s3").slots["board"], "esp32s3")


class DiagnoseTests(unittest.TestCase):
    def test_compile(self):
        log = "/tmp/a/a.ino:3:10: fatal error: DHT.h: No such file or directory\ncompilation terminated."
        r = diag.analyze(log)
        self.assertEqual(r["kind"], "compile")
        self.assertEqual(r["findings"][0]["code"], "missing_library")
        self.assertEqual(r["findings"][0]["auto_fix"]["library"], "DHT sensor library")
        r = diag.analyze("a.ino:12:5: error: 'ledcSetup' was not declared in this scope")
        self.assertEqual(r["findings"][0]["code"], "ledc_api_v3")
        r = diag.analyze("a.ino:20:1: error: expected ';' before '}' token")
        self.assertEqual(r["findings"][0]["line"], 20)

    def test_serial(self):
        log = "rst:0xc (SW_CPU_RESET)\nGuru Meditation Error: Core  1 panic'ed (LoadProhibited). Exception was unhandled.\nBacktrace: 0x400d1234:0x3ffb1f00 0x400d5678:0x3ffb1f20\n"
        codes = [f["code"] for f in diag.analyze(log, "serial")["findings"]]
        self.assertIn("panic", codes)
        self.assertIn("brownout", [f["code"] for f in diag.analyze("Brownout detector was triggered", "serial")["findings"]])
        boot = "\n".join(["rst:0x10 (RTCWDT_RTC_RESET),boot:0x13"] * 4)
        self.assertIn("boot_loop", [f["code"] for f in diag.analyze(boot, "serial")["findings"]])

    def test_verify(self):
        good = "# ESP32 LAB — BH1750\nlux:120.5\nlux:121.0\nlux:119.8\n"
        self.assertEqual(diag.verify_run(good)["verdict"], "ok")
        bad = "# BH1750 (GY-30) : non détecté — vérifiez le câblage\n"
        self.assertEqual(diag.verify_run(bad)["verdict"], "echec")
        self.assertEqual(diag.verify_run("")["verdict"], "incertain")
        self.assertEqual(diag.verify_run("temp:21.0\n", expect=[r"hum:\d"])["verdict"], "incertain")


class FleetTests(unittest.TestCase):
    def _run(self, seed, n=9, size=4.0, cell=0.4, steps=3000):
        rnd = random.Random(seed)
        clock = [0.0]
        clk = lambda: clock[0]  # noqa: E731
        ar = Arena(size, size, cell)
        sim = SimTransport(clk)
        f = Fleet(ar, sim, clock=clk)
        cells = [(x, y) for x in range(ar.cols) for y in range(ar.rows)]
        rnd.shuffle(cells)
        for i, c in enumerate(cells[:n]):
            x, y = ar.center(c)
            sim.add(f"V{i + 1}", x, y)
            f.register(f"V{i + 1}", x, y)
        for i, g in enumerate(cells[n:2 * n]):
            f.set_goal(f"V{i + 1}", *ar.center(g), vmax=0.3)
        mind = 1e9
        for _ in range(steps):
            clock[0] += 0.05
            sim.step(0.05)
            sim.report(f)
            f.tick()
            cars = list(sim.cars.values())
            for a in range(len(cars)):
                for b in range(a + 1, len(cars)):
                    mind = min(mind, math.dist((cars[a]["x"], cars[a]["y"]), (cars[b]["x"], cars[b]["y"])))
            if all(v.state == "arrive" for v in f.vehicles.values()):
                break
        return f, mind

    def test_nine_vehicles_never_collide(self):
        reached = 0
        for seed in range(60):
            f, mind = self._run(seed)
            self.assertEqual(f.violations, 0, f"graine {seed}")
            self.assertGreaterEqual(mind, 0.4 - f.arrive_tol - 0.01, f"graine {seed}")
            reached += sum(v.state == "arrive" for v in f.vehicles.values())
        self.assertGreaterEqual(reached / (60 * 9), 0.98)

    def test_lost_vehicle_stops_and_blocks(self):
        clock = [0.0]
        clk = lambda: clock[0]  # noqa: E731
        sim = SimTransport(clk)
        f = Fleet(Arena(2, 2, 0.4), sim, clock=clk)
        for vid, c in (("V1", (0, 0)), ("V2", (4, 4))):
            x, y = f.arena.center(c)
            sim.add(vid, x, y)
            f.register(vid, x, y)
        clock[0] = 2.0
        f.on_telemetry("V2", *f.arena.center((4, 4)))
        f.tick()
        self.assertEqual(f.vehicles["V1"].state, "perdu")
        self.assertEqual(sim.cars["V1"]["cmd"]["type"], "stop")
        self.assertEqual(f.owner((1, 1)), "V1")   # voisines bloquées

    def test_estop_and_manual_guard(self):
        clock = [0.0]
        clk = lambda: clock[0]  # noqa: E731
        sim = SimTransport(clk)
        f = Fleet(Arena(2, 2, 0.4), sim, clock=clk)
        f.register("V1", 0.2, 0.2)
        f.register("V2", 0.6, 0.2)   # juste devant V1 (cap 0 = +x)
        self.assertEqual(f.manual("V1", 1.0, 0)["throttle"], 0.0)
        f.emergency_stop()
        f.tick()
        self.assertTrue(all(c["cmd"]["type"] == "stop" for c in sim.cars.values()) or not sim.cars)
        with self.assertRaises(ValueError):
            f.register("V3", 0.6, 0.2)   # cellule occupée

    def test_astar(self):
        ar = Arena(2, 2, 0.4, obstacles={(1, 0), (1, 1), (1, 2), (1, 3)})
        self.assertEqual(astar(ar, (0, 0), (2, 0), set(), set())[-1], (2, 0))

    def test_protocol(self):
        key = b"0123456789abcdef0123"
        pkt = encode(key, "V1", "abcd", 7, {"type": "goto", "x": 1.0, "y": 0.5, "vmax": 0.2, "lease_ms": 500})
        self.assertTrue(pkt.startswith(b"NXV1|V1|abcd|7|GOTO|1.000|0.500|0.20|500|"))
        body = "NXV1|V3|ff01|12|POSE|1.2|0.4|0.0|0.1|300|7400|route"
        msg = decode(key, (body + "|" + mac(key, body)).encode())
        self.assertEqual((msg["vid"], msg["front_mm"], msg["state"]), ("V3", 300, "route"))
        self.assertIsNone(decode(key, (body + "|" + "0" * 16).encode()))
        self.assertIsNone(decode(b"autre-cle-de-flotte!", (body + "|" + mac(key, body)).encode()))


class EngineTests(unittest.TestCase):
    def test_conversation_flow(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            self.assertIn("Bonjour", e.chat("bonjour")["answer"])
            e.chat("je m'appelle Aboubacar")
            r = e.chat("je veux faire une station météo avec un BME280 et un écran OLED SSD1306")
            self.assertEqual(r["intent"], "project_new")
            gen = [c for c in r["cards"] if c["type"] == "generate"][0]
            self.assertIn("bme280", gen["modules"])
            self.assertEqual(gen["title"], "Station météo")
            self.assertEqual([m for m in gen["modules"] if "oled" in m], ["oled_ssd1306"])
            g = e.greeting()
            self.assertIn("Aboubacar", g["answer"])
            self.assertIsNotNone(g["followup"])
            r = e.chat("note que la station consomme 80 mA")
            self.assertIn("mesure", r["answer"])
            self.assertTrue(e.chat("qu'est-ce que tu sais sur la station ?")["cards"][0]["items"])
            r = e.chat("améliore la station météo")
            self.assertEqual(r["intent"], "improve")
            self.assertTrue(r["followup"]["choices"])

    def test_hardware_actions_need_confirmation(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            e.chat("je veux faire une station météo avec un BME280")
            r = e.chat("flashe le worker 3 avec la station météo")
            self.assertEqual(r["actions"][0]["kind"], "flash")
            self.assertTrue(r["actions"][0]["needs_confirm"])
            res = e.confirm(r["actions"][0]["id"])
            self.assertTrue(res["execute_in_ui"])
            with self.assertRaises(ValueError):
                e.confirm(r["actions"][0]["id"])
            rep = e.report(r["actions"][0]["id"], True, None, "temp:21.5\thum:40\ntemp:21.6\thum:41\n")
            self.assertEqual(rep["verdict"]["verdict"], "ok")
            r = e.chat("compile la station pour s3")
            out = e.confirm(r["actions"][0]["id"])
            self.assertEqual(e.host.builds[-1][1], "esp32s3")
            self.assertFalse(out["execute_in_ui"])

    def test_drive_and_estop_with_fleet(self):
        with tempfile.TemporaryDirectory() as td:
            clock = [0.0]
            clk = lambda: clock[0]  # noqa: E731
            sim = SimTransport(clk)
            f = Fleet(Arena(4, 4, 0.4), sim, clock=clk)
            for i in range(3):
                x, y = f.arena.center((0, i * 2))
                sim.add(f"V{i + 1}", x, y)
                f.register(f"V{i + 1}", x, y)
            e = new_engine(td, f)
            r = e.chat("toutes les voitures en ligne")
            self.assertEqual(r["actions"][0]["kind"], "fleet_goal")
            self.assertEqual(f.vehicles["V1"].goal, None)      # rien ne bouge avant confirmation
            e.confirm(r["actions"][0]["id"])
            self.assertIsNotNone(f.vehicles["V1"].goal)
            r = e.chat("stop")
            self.assertTrue(f.estop)
            self.assertEqual(r["actions"], [])

    def test_sensors_from_master_feeds(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            r = e.chat("quelle est la température ?", context={})
            self.assertIn("Envoyer les mesures au MASTER", r["answer"])
            ctx = {"lab": {"workers": [{"id": 2, "ip": "192.168.4.12"}, {"id": 3, "ip": "192.168.4.13"}]},
                   "feeds": [{"device": "serre", "key": "dht22_temp", "value": 23.456, "unit": "°C", "ip": "192.168.4.12", "age_ms": 900},
                             {"device": "serre", "key": "dht22_hum", "value": 51, "unit": "%", "ip": "192.168.4.12", "age_ms": 900},
                             {"device": "cuve", "key": "hcsr04_dist", "value": 31.2, "unit": "cm", "ip": "192.168.4.13", "age_ms": 400000}]}
            r = e.chat("quelle est la température ?", context=ctx)
            self.assertEqual(r["intent"], "sensors")
            self.assertIn("23.46 °C", r["answer"])
            self.assertNotIn("dht22_hum", r["answer"])
            r = e.chat("lis les capteurs du worker 3", context=ctx)
            self.assertIn("hcsr04_dist", r["answer"])
            self.assertNotIn("dht22_temp", r["answer"])
            self.assertIn("plus de 2 minutes", r["answer"])

    def test_diagnose_proposes_library(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            r = e.chat("sketch.ino:2:10: fatal error: Adafruit_BME280.h: No such file or directory")
            self.assertEqual(r["actions"][0]["kind"], "install_library")
            self.assertEqual(e.confirm(r["actions"][0]["id"])["result"]["installed"], "Adafruit BME280 Library")


class Phase6Tests(unittest.TestCase):
    """Qui es-tu, actions directes, cartes branchées, fichiers, dépôts, APK sur simple demande."""

    LAB = {"master": {"version": "6.1.0"}, "worker_capacity": 10,
           "workers": [{"id": 1, "state": "PROJECT"}, {"id": 2, "state": "READY", "rssi": -50}, {"id": 5, "state": "OFFLINE"}]}
    SPEC = {"title": "Serre balcon", "board": "esp32", "modules": [{"id": "dht22"}, {"id": "relay"}],
            "rules": [{"if": {"m": 0, "out": "temp", "op": ">", "v": 28, "hyst": 1}, "then": {"m": 1, "act": "on"}, "else": {"m": 1, "act": "off"}}]}

    def test_intents(self):
        for text, name in [("qui es-tu ?", "identity"), ("tu es ma copine ?", "identity"), ("quelles cartes sont branchées ?", "boards"),
                           ("fais un check-up de toutes les cartes", "boards"), ("lance un check-up", "job"), ("crée un dossier serre", "files"),
                           ("crée un fichier serre/notes.txt avec : arroser à 19 h", "files"), ("liste mes fichiers", "files"),
                           ("supprime le dossier essais", "files"), ("crée un dépôt github mon-robot", "github_create"),
                           ("analyse mon projet", "analyze"), ("corrige les erreurs de mon code", "analyze"), ("flash", "flash"), ("compile", "build"),
                           ("fais-moi une apk pour la serre", "apk"), ("lance un voltmètre sur le worker 2", "job"), ("c'est quoi flasher ?", "question")]:
            self.assertEqual(detect(text).name, name, text)
        self.assertTrue(detect("tu es qui pour moi").slots["relation"])
        self.assertEqual(detect("crée un fichier notes.txt avec : bonjour").slots["content"], "bonjour")
        self.assertEqual(detect("fais un test des broches du worker 1").slots, {"job": "GPIO_TEST", "workers": [1]})

    def test_identity_is_warm_and_not_a_girlfriend(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            a = e.chat("qui es-tu ?")["answer"]
            self.assertIn("Patricia", a)
            r = e.chat("tu es ma copine")["answer"]
            self.assertIn("partenaire de labo", r)
            self.assertIn("IA", r)
            self.assertEqual(e.chat("qui es-tu ?")["answer"], a)   # toujours la même réponse

    def test_flash_and_build_target_the_studio(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            ctx = {"lab": self.LAB, "studio": {"spec": self.SPEC, "warnings": []}}
            r = e.chat("flash", context=ctx)
            a = r["actions"][0]
            self.assertEqual((a["kind"], a["params"]["worker"], a["params"]["title"]), ("flash_studio", 2, "Serre balcon"))
            self.assertTrue(a["auto"])
            self.assertTrue(e.confirm(a["id"])["execute_in_ui"])
            b = e.chat("compile", context=ctx)["actions"][0]
            self.assertEqual(b["kind"], "build_studio")
            self.assertIn("Aucun worker", e.chat("flash", context={"lab": {"master": {}, "workers": []}, "studio": ctx["studio"]})["answer"])
            self.assertIn("Quel projet", e.chat("flash", context={"lab": self.LAB})["answer"])

    def test_boards_and_apk(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            r = e.chat("quelles cartes sont branchées ?", context={"lab": self.LAB, "usb": {"connected": True, "chip": "CH340"}})
            self.assertIn("W1", r["answer"])
            self.assertIn("W5", r["answer"])
            self.assertIn("CH340", r["answer"])
            self.assertEqual(r["cards"][0]["type"], "boards")
            r = e.chat("fais un check-up de toutes les cartes", context={"lab": self.LAB})
            self.assertEqual([a["params"]["worker"] for a in r["actions"]], [1, 2])
            r = e.chat("fais-moi une apk pour la serre")
            a = r["actions"][0]
            self.assertEqual(a["kind"], "apk")
            self.assertTrue(a["auto"])
            self.assertIn("serre", a["params"]["title"].lower())
            r = e.chat("crée une apk", context={"studio": {"spec": self.SPEC}})
            self.assertEqual(r["actions"][0]["params"]["spec"]["title"], "Serre balcon")

    def test_files_in_workspace(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            root = Path(td) / "ws"
            e.host.workspace_root = lambda: root
            r = e.chat("crée un dossier serre")
            e.confirm(r["actions"][0]["id"])
            self.assertTrue((root / "serre").is_dir())
            r = e.chat("crée un fichier serre/notes.txt avec : arroser à 19 h")
            self.assertTrue(r["actions"][0]["auto"])
            e.confirm(r["actions"][0]["id"])
            self.assertEqual((root / "serre" / "notes.txt").read_text(), "arroser à 19 h")
            r = e.chat("crée un fichier serre/notes.txt avec : arroser à 20 h")
            self.assertFalse(r["actions"][0]["auto"])   # remplacement : toujours à valider
            e.confirm(r["actions"][0]["id"])
            self.assertIn("20 h", e.chat("lis le fichier serre/notes.txt")["answer"])
            self.assertIn("notes.txt", e.chat("liste mes fichiers")["answer"])
            r = e.chat("supprime le dossier serre")
            self.assertFalse(r["actions"][0]["auto"])
            e.confirm(r["actions"][0]["id"])
            self.assertFalse((root / "serre").exists())
            self.assertTrue(any((root / ".corbeille").rglob("notes.txt")))
            for bad in ("../etc/passwd", ".ssh/x", "a/../../b"):
                self.assertNotIn("actions", {k: v for k, v in e.chat("crée un fichier " + bad).items() if v})

    def test_analyze_and_fix(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            root = Path(td) / "ws"
            (root / "lampe").mkdir(parents=True)
            (root / "lampe" / "lampe.ino").write_text("void setup() {\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  Serial.println(1);\n}\n")
            e.host.workspace_root = lambda: root
            e.host.user_projects = lambda: ["lampe"]
            e.host.project_path = lambda pid: root / pid
            r = e.chat("analyse lampe")
            self.assertEqual(r["intent"], "analyze")
            a = r["actions"][0]
            self.assertEqual(a["kind"], "apply_fix")
            self.assertFalse(a["auto"])   # corriger le code : toujours à valider
            res = e.confirm(a["id"])["result"]
            self.assertTrue(res["applied"])
            code = (root / "lampe" / "lampe.ino").read_text()
            self.assertIn("Serial.begin(115200);", code)
            self.assertIn("pinMode(13, OUTPUT);", code)
            self.assertFalse(e.chat("analyse lampe")["actions"])
            r = e.chat("analyse mon projet", context={"studio": {"spec": self.SPEC, "warnings": ["GPIO2 : broche de démarrage"]}})
            self.assertIn("GPIO2", r["answer"])

    def test_workspace_safety(self):
        from patricia.workspace import Workspace, WorkspaceError
        with tempfile.TemporaryDirectory() as td:
            ws = Workspace(Path(td) / "ws")
            ws.mkdir("a")
            os.symlink("/etc", ws.root / "lien")
            for bad in ("../x", "a/../../x", ".cache", "lien/passwd", "a/" + "/".join("b" * 9)):
                with self.assertRaises(WorkspaceError, msg=bad):
                    ws.path(bad)
            with self.assertRaises(WorkspaceError):
                ws.write("a/prog.exe", "x")
            with self.assertRaises(WorkspaceError):
                ws.delete("")
            self.assertEqual([i["name"] for i in ws.list("")["items"]], ["a"])


class StyleTests(unittest.TestCase):
    def test_flavor_rules(self):
        from patricia import style
        rng = random.Random(1)
        base = {"answer": "Voici le câblage.", "speak": "x"}
        self.assertEqual(style.flavor(dict(base), "greet", "scientifique", rng), base)
        self.assertEqual(style.flavor(dict(base), "estop", "complice", rng), base)
        self.assertEqual(style.flavor(dict(base, actions=[{"id": 1}]), "greet", "complice", rng)["answer"], base["answer"])
        r = style.flavor(dict(base), "greet", "complice", rng)
        self.assertTrue(r["answer"].endswith("Voici le câblage.") or "Voici le câblage." in r["answer"])
        self.assertNotEqual(r["answer"], base["answer"])
        self.assertIsNone(r["speak"])
        self.assertEqual(style.normalize("COMPLICE"), "complice")
        self.assertEqual(style.normalize("autre"), "scientifique")

    def test_engine_style_from_memory(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            e.rng = random.Random(3)
            self.assertEqual(e.style(), "scientifique")
            plain = e.hello()["answer"]
            e.mem.remember("style de patricia", "complice")
            self.assertEqual(e.style(), "complice")
            h = e.hello()
            self.assertNotEqual(h["answer"], plain)
            self.assertTrue(h["speak"])
            stop = e.chat("arrête tout")
            self.assertFalse(any(o in stop["answer"] for o in __import__("patricia.style").style.OPENERS))

class FakeGitHub:
    """API GitHub minimale (utilisateur, dépôts, blobs, arbres, commits, références) pour tester l'envoi."""
    def __init__(self):
        import http.server
        self.repos, self.objects, self.calls = {}, {}, []
        gh = self

        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def send(self, code, obj):
                data = json.dumps(obj).encode()
                self.send_response(code); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)

            def body(self):
                n = int(self.headers.get("Content-Length") or 0)
                return json.loads(self.rfile.read(n) or b"{}")

            def handle_any(self, method):
                gh.calls.append((method, self.path))
                if self.headers.get("Authorization") != "Bearer ghp_" + "x" * 36:
                    return self.send(401, {"message": "Bad credentials"})
                parts = self.path.strip("/").split("/")
                if self.path == "/user":
                    return self.send(200, {"login": "prince"})
                if self.path == "/user/repos" and method == "POST":
                    b = self.body(); key = "prince/" + b["name"]
                    gh.repos[key] = {"name": b["name"], "private": b["private"], "default_branch": "main", "html_url": "https://github.com/" + key, "head": None, "files": {}}
                    if b.get("auto_init"):
                        gh.objects["c0"] = {"tree": {"sha": "t0"}}; gh.objects["t0"] = {"files": {"README.md": b"init"}}; gh.repos[key]["head"] = "c0"
                    return self.send(201, {k: v for k, v in gh.repos[key].items() if k not in ("files", "head")})
                if parts[0] == "repos":
                    key = parts[1] + "/" + parts[2]; r = gh.repos.get(key)
                    if r is None:
                        return self.send(404, {"message": "Not Found"})
                    rest = parts[3:]
                    if not rest:
                        return self.send(200, {k: v for k, v in r.items() if k not in ("files", "head")})
                    if rest[:3] == ["git", "ref", "heads"]:
                        return self.send(200, {"object": {"sha": r["head"]}}) if r["head"] else self.send(409, {"message": "Git Repository is empty."})
                    if rest[:2] == ["git", "commits"] and method == "GET":
                        return self.send(200, gh.objects[rest[2]])
                    if rest[:2] == ["git", "blobs"]:
                        b = self.body(); sha = "b%d" % len(gh.objects); gh.objects[sha] = base64.b64decode(b["content"]); return self.send(201, {"sha": sha})
                    if rest[:2] == ["git", "trees"]:
                        b = self.body(); files = dict(gh.objects[b["base_tree"]]["files"])
                        files.update({e["path"]: gh.objects[e["sha"]] for e in b["tree"]}); sha = "t%d" % len(gh.objects); gh.objects[sha] = {"files": files}; return self.send(201, {"sha": sha})
                    if rest[:2] == ["git", "commits"]:
                        b = self.body(); sha = "c%d" % len(gh.objects); gh.objects[sha] = {"tree": {"sha": b["tree"]}, "message": b["message"]}; return self.send(201, {"sha": sha})
                    if rest[:3] == ["git", "refs", "heads"] and method == "PATCH":
                        b = self.body(); r["head"] = b["sha"]; r["files"] = gh.objects[gh.objects[b["sha"]]["tree"]["sha"]]["files"]; return self.send(200, {})
                return self.send(404, {"message": "Not Found"})

            def do_GET(self): self.handle_any("GET")
            def do_POST(self): self.handle_any("POST")
            def do_PATCH(self): self.handle_any("PATCH")
            def do_PUT(self): self.handle_any("PUT")

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = "http://127.0.0.1:%d" % self.server.server_address[1]


class GitHubTests(unittest.TestCase):
    def test_intent(self):
        for text in ("envoie la serre sur github", "crée un dépôt github pour station_meteo", "pousse mon projet sur GitHub en public"):
            self.assertEqual(detect(text).name, "github_push", text)
        self.assertTrue(detect("pousse mon projet sur GitHub en public").slots["public"])
        self.assertEqual(detect("note que mon github est prince").name, "note_add")

    def test_push_project_with_confirmation(self):
        from patricia import github
        fake = FakeGitHub()
        with tempfile.TemporaryDirectory() as td:
            old = (github.API, github.CONFIG)
            github.API, github.CONFIG = fake.url, Path(td) / "gh" / "github.json"
            try:
                proj = Path(td) / "serre_auto"
                (proj / "bin" / "esp32").mkdir(parents=True)
                (proj / "serre_auto.ino").write_text("void setup(){}\nvoid loop(){}\n")
                (proj / "MONTAGE.md").write_text("# Montage\n")
                (proj / "bin" / "esp32" / "serre_auto.bin").write_bytes(b"\0" * 64)

                class Host(FakeHost):
                    def user_projects(self):
                        return ["serre_auto"]

                    def github_push(self, pid, repo, private=None):
                        return github.push_project(proj, pid, repo, private)

                e = Engine(Memory(Path(td) / "m.sqlite3"), Knowledge(CATALOG), Host(None), lambda: {})
                self.assertIn("jeton", e.chat("envoie serre_auto sur github")["answer"])
                with self.assertRaises(github.GitHubError):
                    github.configure("ghp_" + "y" * 36)
                st = github.configure("ghp_" + "x" * 36)
                self.assertEqual(st, {"configured": True, "login": "prince", "owner": "", "private": True})
                self.assertEqual(oct(github.CONFIG.stat().st_mode & 0o777), "0o600")
                r = e.chat("envoie serre_auto sur github")
                self.assertEqual(r["intent"], "github_push")
                self.assertIn("prince/serre_auto", r["answer"])
                self.assertFalse(fake.repos, "rien ne doit partir avant la confirmation")
                done = e.confirm(r["actions"][0]["id"])["result"]
                self.assertTrue(done["created"] and done["private"])
                files = fake.repos["prince/serre_auto"]["files"]
                self.assertEqual(sorted(files), ["MONTAGE.md", "README.md", "serre_auto.ino"])
                self.assertIn(b"void setup", files["serre_auto.ino"])
                # second envoi : même dépôt, nouveau commit, pas de recréation
                (proj / "serre_auto.ino").write_text("// v2\n")
                again = github.push_project(proj, "serre_auto")
                self.assertFalse(again["created"])
                self.assertEqual(fake.repos["prince/serre_auto"]["files"]["serre_auto.ino"], b"// v2\n")
                self.assertNotIn("token", github.status())
            finally:
                github.API, github.CONFIG = old
                fake.server.shutdown()

class VoiceTests(unittest.TestCase):
    def test_spoken_text(self):
        from patricia import voice
        t = voice.spoken("**W3** chauffe à 45°C → 80% sur 3.3 V\n```cpp\nint x;\n```\nhttps://exemple.fr 😅")
        self.assertEqual(t, "worker 3 chauffe à 45 degrés vers 80 pour cent sur 3,3 volts. (le code est affiché à l'écran). le lien affiché.")
        self.assertIn("192.168.4.1", voice.spoken("ouvre 192.168.4.1"))

    def test_piper_pace(self):
        from unittest import mock
        from patricia import voice
        seen = {}

        def fake_run(cmd, **kw):
            seen["cmd"] = cmd
            return mock.Mock(returncode=0, stdout=b"RIFF....", stderr=b"")
        with tempfile.TemporaryDirectory() as d, mock.patch.object(voice, "PIPER_VOICE", Path(d) / "v.onnx"), \
                mock.patch.object(voice.subprocess, "run", fake_run), mock.patch.dict(os.environ, {}, clear=False):
            (Path(d) / "v.onnx").write_bytes(b"x")
            os.environ.pop("NEXUS_PIPER_SPEED", None)
            voice.synthesize("Bonjour. Je suis Patricia.")
            cmd = seen["cmd"]
            self.assertEqual(cmd[cmd.index("--length_scale") + 1], "1.08")
            self.assertEqual(cmd[cmd.index("--sentence_silence") + 1], "0.25")
            os.environ["NEXUS_PIPER_SPEED"] = "1.2"
            voice.synthesize("Bonjour.", rate=0.95)        # débit normal de l'interface = base du Pi
            self.assertEqual(seen["cmd"][seen["cmd"].index("--length_scale") + 1], "1.20")
            voice.synthesize("Bonjour.", speed=0.9)        # ancien client : length_scale absolu
            self.assertEqual(seen["cmd"][seen["cmd"].index("--length_scale") + 1], "0.90")


class AgentHttpTests(unittest.TestCase):
    """Démarre le vrai serveur de l'agent sur un port libre, avec des dossiers temporaires."""

    def test_routes(self):
        with tempfile.TemporaryDirectory() as td:
            env = {"NEXUS_DATA": td, "NEXUS_TOKEN": "t" * 40, "NEXUS_PROJECTS": str(Path(td) / "lib"),
                   "NEXUS_CATALOG": str(CATALOG), "NEXUS_FLEET_KEY": "", "NEXUS_PORT": "0"}
            old = {k: os.environ.get(k) for k in env}
            os.environ.update(env)
            try:
                if "nexus_agent" in sys.modules:
                    del sys.modules["nexus_agent"]
                agent = importlib.import_module("nexus_agent")
                for p in (agent.DATA, agent.PROJECTS, agent.USER_PROJECTS, agent.FIRMWARE, agent.BUILDS, agent.APPS, agent.DB.parent):
                    p.mkdir(parents=True, exist_ok=True)
                agent.init()
                agent.FLEET = agent.FleetService("", agent.Arena())
                agent.ENGINE = agent.Engine(agent.Memory(agent.PATRICIA_DB), agent.Knowledge(agent.CATALOG), agent.AgentHost(agent.FLEET), lambda: {})
                srv = agent.ThreadingHTTPServer(("127.0.0.1", 0), agent.Api)
                threading.Thread(target=srv.serve_forever, daemon=True).start()
                base = f"http://127.0.0.1:{srv.server_address[1]}"

                def call(path, body=None, token=True):
                    req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None,
                                                 headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + "t" * 40} if token else {})},
                                                 method="POST" if body is not None else "GET")
                    try:
                        with urllib.request.urlopen(req, timeout=10) as r:
                            return r.status, json.loads(r.read())
                    except urllib.error.HTTPError as e:
                        return e.code, json.loads(e.read())

                self.assertEqual(call("/api/v1/patricia/hello", token=False)[0], 401)
                st, r = call("/api/v1/patricia/chat", {"q": "note que le relais claque à 5 V", "session": "s1"})
                self.assertEqual(st, 200)
                self.assertEqual(r["intent"], "note_add")
                st, mem = call("/api/v1/patricia/memory")
                self.assertEqual(mem["stats"]["notes"], 1)
                st, d = call("/api/v1/patricia/diagnose", {"log": "Brownout detector was triggered"})
                self.assertEqual(d["findings"][0]["code"], "brownout")
                st, fl = call("/api/v1/fleet")
                self.assertFalse(fl["enabled"])
                st, v = call("/api/v1/patricia/voice")
                self.assertIn("stt", v)
                st, _ = call("/api/v1/patricia/actions/0123456789abcdef/confirm", {})
                self.assertEqual(st, 404)
                # temps de compilation prévu : défaut prudent, puis historique du Pi
                st, est = call("/api/v1/build/estimate?project=serre&board=esp32s3")
                self.assertEqual((st, est["basis"], est["total_s"]), (200, "default", agent.FIRST_BUILD_S["esp32s3"]))
                with agent.connect() as c:
                    for i, el in enumerate((100, 140, 120)):
                        c.execute("INSERT INTO jobs(id,project,board,status,priority,created,finished,elapsed,kind) VALUES(?,?,?,?,?,?,?,?,?)",
                                  (f"j{i}", "autre", "esp32s3", "success", 50, agent.now(), f"2026-01-0{i + 1}T00:00:00+00:00", el, "esp"))
                    c.execute("INSERT INTO jobs(id,project,board,status,priority,created,kind) VALUES('q1','x','esp32s3','queued',50,?,'esp')", (agent.now(),))
                st, est = call("/api/v1/build/estimate?project=serre&board=esp32s3")
                self.assertEqual((est["basis"], est["build_s"], est["ahead"], est["wait_s"]), ("board", 120, 1, 120))
                with agent.connect() as c:
                    c.execute("INSERT INTO jobs(id,project,board,status,priority,created,finished,elapsed,kind) VALUES('j9','serre','esp32s3','success',50,?,?,95,'esp')", (agent.now(), agent.now()))
                st, est = call("/api/v1/build/estimate?project=serre&board=esp32s3")
                self.assertEqual((est["basis"], est["build_s"]), ("project", 95))
                # liaison Pi ↔ S3 : ping public, annonce au S3, perte quand le S3 ne répond plus
                st, pg = call("/api/v1/ping", token=False)
                self.assertEqual((st, pg), (200, {"ok": True}))
                import http.server
                seen = []

                class S3(http.server.BaseHTTPRequestHandler):
                    def log_message(self, *a):
                        pass

                    def do_GET(self):
                        seen.append(self.path)
                        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b'{"ok":true}')
                s3 = http.server.ThreadingHTTPServer(("127.0.0.1", 0), S3)
                threading.Thread(target=s3.serve_forever, daemon=True).start()
                agent.S3_URL = f"http://127.0.0.1:{s3.server_address[1]}"
                st, lk = call("/api/v1/link?now=1")
                self.assertTrue(lk["up"] and lk["samples"] == 1 and lk["loss_pct"] == 0 and lk["rtt_ms"] is not None)
                self.assertTrue(seen[0].startswith("/api/link/hello?port="))
                s3.shutdown(); s3.server_close()
                for _ in range(3):
                    agent.link_probe()
                st, lk = call("/api/v1/link")
                self.assertFalse(lk["up"])
                self.assertEqual((lk["samples"], lk["loss_pct"], lk["history"][1:]), (4, 75, [None, None, None]))
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
