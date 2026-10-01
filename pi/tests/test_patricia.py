"""Tests de Patricia et du superviseur de flotte (aucun matériel, aucune compilation).

    python3 -m unittest discover -s pi/tests -v
"""
from __future__ import annotations

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

    def test_diagnose_proposes_library(self):
        with tempfile.TemporaryDirectory() as td:
            e = new_engine(td)
            r = e.chat("sketch.ino:2:10: fatal error: Adafruit_BME280.h: No such file or directory")
            self.assertEqual(r["actions"][0]["kind"], "install_library")
            self.assertEqual(e.confirm(r["actions"][0]["id"])["result"]["installed"], "Adafruit BME280 Library")


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
