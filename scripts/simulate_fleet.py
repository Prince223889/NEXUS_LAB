#!/usr/bin/env python3
"""Simulateur de voitures NEXUS : teste l'écran Flotte et Patricia sans matériel.

Simule N véhicules qui parlent exactement le protocole NXV1 du firmware firmware/vehicle (HMAC, bail,
SETPOSE, GOTO, DRIVE, STOP, arrêt sur obstacle) et les fait apparaître au superviseur du Pi.

    python3 scripts/simulate_fleet.py --key "<NEXUS_FLEET_KEY>" --count 4 --pi 127.0.0.1
    (sur le Pi lui-même, ou sur un PC du réseau ESP32-LAB avec --pi 192.168.4.x)

Puis : écran « Flotte de véhicules » → « Placer » chaque véhicule annoncé → clic sur une cellule.
"""
from __future__ import annotations

import argparse
import math
import os
import socket
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pi"))
from patricia.fleet_net import CMD_PORT, TELEMETRY_PORT, mac  # noqa: E402


class Car:
    def __init__(self, vid: str):
        self.vid, self.nonce = vid, os.urandom(4).hex()
        self.x = self.y = self.h = self.v = 0.0
        self.tx = 0
        self.rx = 0
        self.cmd: dict = {"t": "STOP"}
        self.until = 0.0
        self.pose_set = False
        self.state = "nopose"

    def frame(self, key: bytes, payload: str) -> bytes:
        self.tx += 1
        body = f"NXV1|{self.vid}|{self.nonce}|{self.tx}|{payload}"
        return (body + "|" + mac(key, body)).encode()

    def step(self, dt: float, now: float) -> None:
        c = self.cmd
        if c["t"] == "STOP" or now > self.until:
            if c["t"] != "STOP" and self.state not in ("arret", "nopose"):
                self.state = "bail_expire"
            self.v = 0.0
            return
        if c["t"] == "GOTO":
            dx, dy = c["x"] - self.x, c["y"] - self.y
            d = math.hypot(dx, dy)
            if d < 0.01:
                self.v, self.state = 0.0, "arrive"
                return
            target = math.atan2(dy, dx)
            err = math.atan2(math.sin(target - self.h), math.cos(target - self.h))
            if abs(err) > 0.6:     # rotation sur place, comme le firmware
                self.h += max(-2.5 * dt, min(2.5 * dt, err))
                self.v = 0.0
                return
            self.h += err * min(1.0, 4 * dt)
            step = min(d, c["vmax"] * dt)
            self.x += math.cos(self.h) * step
            self.y += math.sin(self.h) * step
            self.v, self.state = step / dt, "route"
        elif c["t"] == "DRIVE":
            self.h += c["steer"] * 1.5 * dt
            sp = c["thr"] * 0.4
            self.x += math.cos(self.h) * sp * dt
            self.y += math.sin(self.h) * sp * dt
            self.v, self.state = sp, "manuel"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--key", default=os.getenv("NEXUS_FLEET_KEY", ""), help="clé de flotte (NEXUS_FLEET_KEY)")
    ap.add_argument("--count", type=int, default=3)
    ap.add_argument("--pi", default="127.0.0.1", help="adresse du Pi")
    ap.add_argument("--duration", type=float, default=0, help="secondes (0 = sans fin)")
    a = ap.parse_args()
    if len(a.key) < 16:
        print("Clé de flotte absente ou trop courte (--key).")
        return 2
    key = a.key.encode()
    cars = {f"V{i + 1}": Car(f"V{i + 1}") for i in range(max(1, min(9, a.count)))}
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", CMD_PORT))
    sock.settimeout(0.02)
    known = False
    last_pose = last_hello = 0.0
    t0 = prev = time.monotonic()
    print(f"{len(cars)} véhicule(s) simulé(s) → {a.pi}:{TELEMETRY_PORT}. Ctrl+C pour arrêter.")
    try:
        while not a.duration or time.monotonic() - t0 < a.duration:
            try:
                data, _ = sock.recvfrom(512)
                text = data.decode("ascii", "replace").strip()
                body, _, sig = text.rpartition("|")
                f = body.split("|")
                car = cars.get(f[1]) if len(f) > 4 else None
                if car and sig == mac(key, body) and f[2] == car.nonce and int(f[3]) > car.rx:
                    car.rx = int(f[3])
                    known = True
                    now = time.monotonic()
                    if f[4] == "SETPOSE":
                        car.x, car.y, car.h = float(f[5]), float(f[6]), float(f[7])
                        car.pose_set, car.state, car.cmd = True, "pret", {"t": "STOP"}
                    elif not car.pose_set:
                        car.state = "nopose"
                    elif f[4] == "STOP":
                        car.cmd, car.state = {"t": "STOP"}, "arret"
                    elif f[4] == "GOTO":
                        car.cmd = {"t": "GOTO", "x": float(f[5]), "y": float(f[6]), "vmax": float(f[7])}
                        car.until = now + min(int(f[8]), 800) / 1000
                    elif f[4] == "DRIVE":
                        car.cmd = {"t": "DRIVE", "thr": float(f[5]), "steer": float(f[6])}
                        car.until = now + min(int(f[7]), 800) / 1000
            except socket.timeout:
                pass
            now = time.monotonic()
            for car in cars.values():
                car.step(now - prev, now)
            prev = now
            if now - last_hello > 1.0:
                last_hello = now
                for car in cars.values():
                    if not car.pose_set:
                        sock.sendto(car.frame(key, f"HELLO|{car.x:.3f}|{car.y:.3f}|{car.h:.3f}|7400"), (a.pi, TELEMETRY_PORT))
            if known and now - last_pose > 0.1:
                last_pose = now
                for car in cars.values():
                    sock.sendto(car.frame(key, f"POSE|{car.x:.3f}|{car.y:.3f}|{car.h:.3f}|{car.v:.3f}|-1|7400|{car.state}"), (a.pi, TELEMETRY_PORT))
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
