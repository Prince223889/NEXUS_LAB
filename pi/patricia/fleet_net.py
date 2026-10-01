"""Liaison radio Pi ⇄ véhicules (protocole NXV1 sur UDP, authentifié par HMAC-SHA256).

Trames (texte, une par datagramme) :
  véhicule → Pi  (port 4231)  NXV1|<vid>|<nonce>|<seq>|HELLO|<x>|<y>|<cap>|<batt_mv>|<mac>
                               NXV1|<vid>|<nonce>|<seq>|POSE|<x>|<y>|<cap>|<v>|<avant_mm>|<batt_mv>|<etat>|<mac>
  Pi → véhicule  (port 4230)  NXV1|<vid>|<nonce>|<seq>|GOTO|<x>|<y>|<vmax>|<bail_ms>|<mac>
                               NXV1|<vid>|<nonce>|<seq>|DRIVE|<gaz>|<direction>|<bail_ms>|<mac>
                               NXV1|<vid>|<nonce>|<seq>|SETPOSE|<x>|<y>|<cap>|<mac>   (position de départ)
                               NXV1|<vid>|<nonce>|<seq>|STOP|<mac>

<nonce> est tiré au hasard par le véhicule à chaque démarrage ; <seq> croît strictement dans chaque sens
(côté Pi il part de l'horloge, 20 par seconde depuis 2025, pour rester croissant après un redémarrage du Pi).
Un véhicule dont l'état vaut « nopose » n'a pas encore reçu SETPOSE : ses positions sont ignorées.
Une trame rejouée, d'un autre démarrage ou mal signée est ignorée. <mac> = 16 premiers caractères hexa
de HMAC-SHA256(clé de flotte, tout ce qui précède le dernier « | »). La même clé est écrite dans
firmware/vehicle/config.h et dans NEXUS_FLEET_KEY sur le Pi.
"""
from __future__ import annotations

import hashlib
import hmac
import math
import socket
import threading
import time

from .fleet import Arena, Fleet

CMD_PORT = 4230
TELEMETRY_PORT = 4231


def mac(key: bytes, body: str) -> str:
    return hmac.new(key, body.encode("utf-8"), hashlib.sha256).hexdigest()[:16]


def encode(key: bytes, vid: str, nonce: str, seq: int, cmd: dict) -> bytes:
    t = cmd["type"]
    if t == "goto":
        parts = ["GOTO", f"{cmd['x']:.3f}", f"{cmd['y']:.3f}", f"{cmd['vmax']:.2f}", str(int(cmd["lease_ms"]))]
    elif t == "setpose":
        parts = ["SETPOSE", f"{cmd['x']:.3f}", f"{cmd['y']:.3f}", f"{cmd['heading']:.3f}"]
    elif t == "drive":
        parts = ["DRIVE", f"{cmd['throttle']:.3f}", f"{cmd['steer']:.3f}", str(int(cmd["lease_ms"]))]
    else:
        parts = ["STOP"]
    body = "|".join(["NXV1", vid, nonce, str(seq)] + parts)
    return (body + "|" + mac(key, body)).encode("ascii")


def decode(key: bytes, data: bytes) -> dict | None:
    try:
        text = data.decode("ascii").strip()
    except UnicodeDecodeError:
        return None
    body, _, sig = text.rpartition("|")
    if not body.startswith("NXV1|") or not hmac.compare_digest(sig, mac(key, body)):
        return None
    f = body.split("|")
    try:
        msg = {"vid": f[1], "nonce": f[2], "seq": int(f[3]), "type": f[4]}
        if msg["type"] == "HELLO":
            msg.update(x=float(f[5]), y=float(f[6]), heading=float(f[7]), battery_mv=int(f[8]))
        elif msg["type"] == "POSE":
            msg.update(x=float(f[5]), y=float(f[6]), heading=float(f[7]), speed=float(f[8]), front_mm=int(f[9]), battery_mv=int(f[10]), state=f[11])
        else:
            return None
    except (IndexError, ValueError):
        return None
    if not (msg["vid"].isalnum() and len(msg["vid"]) <= 12 and all(map(math.isfinite, (msg["x"], msg["y"], msg["heading"])))):
        return None
    return msg


class UdpTransport:
    def __init__(self, key: bytes, bind: str = "0.0.0.0"):
        self.key = key
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind((bind, TELEMETRY_PORT))
        self.sock.settimeout(0.2)
        self.peers: dict[str, dict] = {}      # vid → {addr, nonce, rx_seq, tx_seq}
        self.lock = threading.Lock()

    def send(self, vid: str, cmd: dict) -> None:
        with self.lock:
            p = self.peers.get(vid)
            if not p:
                return
            p["tx_seq"] += 1
            pkt = encode(self.key, vid, p["nonce"], p["tx_seq"], cmd)
            addr = p["addr"]
        self.sock.sendto(pkt, (addr, CMD_PORT))

    def receive(self) -> dict | None:
        try:
            data, (addr, _port) = self.sock.recvfrom(512)
        except (socket.timeout, OSError):
            return None
        msg = decode(self.key, data)
        if not msg:
            return None
        with self.lock:
            p = self.peers.get(msg["vid"])
            if msg["type"] == "HELLO":
                if p and p["nonce"] == msg["nonce"] and msg["seq"] <= p["rx_seq"]:
                    return None
                tx = max(p["tx_seq"] if p else 0, int((time.time() - 1735689600) * 20))
                self.peers[msg["vid"]] = {"addr": addr, "nonce": msg["nonce"], "rx_seq": msg["seq"], "tx_seq": tx}
            else:
                if not p or p["nonce"] != msg["nonce"] or msg["seq"] <= p["rx_seq"]:
                    if not p:   # Pi redémarré : on apprend le véhicule depuis sa première position signée
                        self.peers[msg["vid"]] = {"addr": addr, "nonce": msg["nonce"], "rx_seq": msg["seq"],
                                                  "tx_seq": int((time.time() - 1735689600) * 20)}
                        return msg
                    return None
                p["rx_seq"], p["addr"] = msg["seq"], addr
        return msg


class FleetService:
    """Fait tourner le superviseur : réception des positions et cycle de commande à 10 Hz."""

    def __init__(self, key: str, arena: Arena | None = None):
        self.key = key.encode("utf-8") if key else b""
        self.fleet = Fleet(arena or Arena())
        self.transport: UdpTransport | None = None
        self.error = ""
        self.seen: dict[str, dict] = {}       # véhicules annoncés, inscrits ou non
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []

    @property
    def enabled(self) -> bool:
        return len(self.key) >= 16

    def start(self) -> None:
        if not self.enabled:
            self.error = "NEXUS_FLEET_KEY absente ou trop courte (16 caractères minimum) : pilotage désactivé."
            return
        try:
            self.transport = UdpTransport(self.key)
        except OSError as e:
            self.error = f"Port UDP {TELEMETRY_PORT} indisponible : {e}"
            return
        self.fleet.transport = self.transport
        for target, name in ((self._rx_loop, "nexus-fleet-rx"), (self._tick_loop, "nexus-fleet-tick")):
            th = threading.Thread(target=target, name=name, daemon=True)
            th.start()
            self._threads.append(th)

    def stop(self) -> None:
        if self.transport:
            self.fleet.emergency_stop()
        self._stop.set()

    def _rx_loop(self) -> None:
        while not self._stop.is_set():
            msg = self.transport.receive() if self.transport else None
            if not msg:
                continue
            vid = msg["vid"]
            self.seen[vid] = {"id": vid, "x": msg["x"], "y": msg["y"], "heading": msg["heading"], "battery_mv": msg.get("battery_mv", 0),
                              "state": msg.get("state", "hello"), "at": time.time()}
            if msg["type"] == "POSE" and msg["state"] == "nopose" and vid in self.fleet.vehicles:
                self.fleet.resend_pose(vid)
            elif msg["type"] == "POSE":
                self.fleet.on_telemetry(vid, msg["x"], msg["y"], msg["heading"], msg["speed"], msg["front_mm"], msg["battery_mv"])

    def _tick_loop(self) -> None:
        while not self._stop.is_set():
            t0 = time.monotonic()
            if self.fleet.vehicles:
                self.fleet.tick()
            self._stop.wait(max(0.0, 0.1 - (time.monotonic() - t0)))

    def snapshot(self) -> dict:
        snap = self.fleet.snapshot()
        snap["enabled"] = self.enabled and self.transport is not None
        snap["error"] = self.error
        registered = set(self.fleet.vehicles)
        snap["announced"] = [v for k, v in sorted(self.seen.items()) if k not in registered and time.time() - v["at"] < 10]
        return snap
