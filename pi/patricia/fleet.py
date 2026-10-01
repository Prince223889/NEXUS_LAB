"""Superviseur de flotte : jusqu'à 9 véhicules (workers ESP32 montés sur voitures) sans collision.

Principe (inspiré de la réservation de cellules des robots d'entrepôt) :
  * l'aire de jeu est une grille de cellules carrées dont le côté vaut la distance de séparation minimale ;
  * un véhicule ne possède jamais plus de deux cellules : celle où il est et celle où il va ;
  * il n'avance vers la cellule suivante qu'après l'avoir réservée ; deux véhicules ne réservent jamais
    la même cellule, donc leurs centres restent à au moins une cellule l'un de l'autre ;
  * un véhicule dont la position n'arrive plus (> stale_s) est déclaré perdu : on lui envoie STOP et ses
    cellules ET leurs voisines restent bloquées pour les autres ;
  * blocage face à face : après `yield_s` d'attente, le véhicule le moins prioritaire recalcule un chemin
    qui contourne les cellules occupées ;
  * contrôle indépendant des distances réelles : si deux positions mesurées passent sous `min_sep_m`,
    les deux véhicules sont arrêtés et marqués « conflit » jusqu'à intervention ;
  * arrêt d'urgence global, sans confirmation, répété à chaque cycle tant qu'il n'est pas levé.

Chaque ordre envoyé porte un bail (lease) court : le firmware du véhicule (firmware/vehicle) coupe ses
moteurs si aucun ordre valide n'arrive avant expiration, et son capteur ultrason l'arrête seul devant
un obstacle. Le superviseur ne remplace pas ces sécurités embarquées.

LIMITE IMPORTANTE : la précision dépend de la position que chaque véhicule renvoie (odométrie des roues,
qui dérive). Ce module est vérifié en simulation (pi/tests) ; il n'a pas été essayé sur de vrais véhicules.
"""
from __future__ import annotations

import heapq
import math
import threading
import time
from dataclasses import dataclass, field
from typing import Callable, Protocol

MAX_VEHICLES = 9


class Transport(Protocol):
    def send(self, vid: str, cmd: dict) -> None: ...


@dataclass
class Arena:
    width_m: float = 4.0
    height_m: float = 4.0
    cell_m: float = 0.40              # = distance minimale entre deux centres de véhicules
    obstacles: set = field(default_factory=set)   # cellules interdites {(cx, cy)}

    @property
    def cols(self) -> int:
        return max(1, int(math.floor(self.width_m / self.cell_m + 1e-9)))

    @property
    def rows(self) -> int:
        return max(1, int(math.floor(self.height_m / self.cell_m + 1e-9)))

    def cell_of(self, x: float, y: float) -> tuple[int, int]:
        return (min(self.cols - 1, max(0, int(x // self.cell_m))), min(self.rows - 1, max(0, int(y // self.cell_m))))

    def center(self, c: tuple[int, int]) -> tuple[float, float]:
        return ((c[0] + 0.5) * self.cell_m, (c[1] + 0.5) * self.cell_m)

    def inside(self, x: float, y: float) -> bool:
        return 0 <= x < self.cols * self.cell_m and 0 <= y < self.rows * self.cell_m

    def free(self, c: tuple[int, int]) -> bool:
        return 0 <= c[0] < self.cols and 0 <= c[1] < self.rows and c not in self.obstacles


@dataclass
class Vehicle:
    vid: str
    priority: int
    x: float = 0.0
    y: float = 0.0
    heading: float = 0.0
    speed: float = 0.0
    front_mm: int = -1
    battery_mv: int = 0
    last_seen: float = 0.0
    state: str = "inconnu"         # inconnu | pret | route | attente | arrive | perdu | conflit | arret | manuel | bloque
    mode: str = "auto"             # auto | manuel
    goal: tuple | None = None
    path: list = field(default_factory=list)
    held: list = field(default_factory=list)     # cellules réservées : [actuelle] ou [actuelle, suivante]
    waiting_since: float | None = None
    last_yield: float = 0.0
    pause_until: float = 0.0          # après s'être écarté : laisser passer l'autre avant de repartir
    vmax: float = 0.25
    manual: tuple = (0.0, 0.0)
    note: str = ""

    def pos(self) -> tuple[float, float]:
        return (self.x, self.y)


class Fleet:
    def __init__(self, arena: Arena | None = None, transport: Transport | None = None,
                 clock: Callable[[], float] = time.monotonic, stale_s: float = 1.0, yield_s: float = 1.5,
                 min_sep_m: float | None = None, lease_ms: int = 500, arrive_tol_m: float = 0.03):
        self.arena = arena or Arena()
        self.transport = transport
        self.clock = clock
        self.stale_s = stale_s
        self.yield_s = yield_s
        self.min_sep_m = min_sep_m if min_sep_m is not None else self.arena.cell_m * 0.8
        self.lease_ms = lease_ms
        self.arrive_tol = arrive_tol_m
        self.vehicles: dict[str, Vehicle] = {}
        self.estop = False
        self.events: list[dict] = []
        self.violations = 0
        self.lock = threading.RLock()

    # ------------------------------------------------------------ journal
    def _event(self, level: str, msg: str, vid: str | None = None) -> None:
        self.events.append({"t": round(self.clock(), 2), "level": level, "vid": vid, "msg": msg})
        del self.events[:-200]

    # ------------------------------------------------------- inscription
    def register(self, vid: str, x: float, y: float, heading: float = 0.0) -> Vehicle:
        with self.lock:
            if vid not in self.vehicles and len(self.vehicles) >= MAX_VEHICLES:
                raise ValueError(f"La flotte est limitée à {MAX_VEHICLES} véhicules (le S3 accepte 10 clients Wi-Fi, dont le Pi).")
            if not self.arena.inside(x, y):
                raise ValueError("Position hors de l'aire de jeu.")
            c = self.arena.cell_of(x, y)
            owner = self.owner(c)
            if owner and owner != vid:
                raise ValueError(f"La cellule de départ est déjà occupée par {owner}.")
            v = self.vehicles.get(vid) or Vehicle(vid, priority=len(self.vehicles))
            v.x, v.y, v.heading, v.last_seen = x, y, heading, self.clock()
            v.held, v.state, v.path, v.goal = [c], "pret", [], None
            self.vehicles[vid] = v
            self._send(vid, {"type": "setpose", "x": round(x, 3), "y": round(y, 3), "heading": round(heading, 3)})
            self._event("info", f"{vid} inscrit en {c}", vid)
            return v

    def resend_pose(self, vid: str) -> None:
        """Le véhicule a redémarré ou n'a pas reçu sa position : on lui renvoie la dernière connue."""
        with self.lock:
            v = self.vehicles.get(vid)
            if v:
                v.last_seen = self.clock()
                self._send(vid, {"type": "setpose", "x": round(v.x, 3), "y": round(v.y, 3), "heading": round(v.heading, 3)})

    def remove(self, vid: str) -> None:
        with self.lock:
            if vid in self.vehicles:
                self._send(vid, {"type": "stop"})
                del self.vehicles[vid]

    def owner(self, c: tuple[int, int], exclude: str | None = None) -> str | None:
        for v in self.vehicles.values():
            if v.vid != exclude and c in self._blocked_by(v):
                return v.vid
        return None

    def _blocked_by(self, v: Vehicle) -> set:
        cells = set(v.held)
        if v.state in ("perdu", "conflit"):   # position incertaine : on élargit la zone interdite
            for (cx, cy) in list(cells):
                cells |= {(cx + dx, cy + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
        return cells

    # -------------------------------------------------------- télémétrie
    def on_telemetry(self, vid: str, x: float, y: float, heading: float = 0.0, speed: float = 0.0,
                     front_mm: int = -1, battery_mv: int = 0) -> None:
        with self.lock:
            v = self.vehicles.get(vid)
            if not v:
                return
            v.x, v.y, v.heading, v.speed = float(x), float(y), float(heading), float(speed)
            v.front_mm, v.battery_mv, v.last_seen = int(front_mm), int(battery_mv), self.clock()
            if v.state == "perdu":
                v.state = "attente" if v.goal else "pret"
                self._event("info", f"{vid} de nouveau joignable", vid)
            if 0 <= v.front_mm < 150 and v.state == "route":
                v.state = "bloque"
                v.note = f"obstacle à {v.front_mm} mm"

    # ---------------------------------------------------------- commandes
    def set_goal(self, vid: str, x: float, y: float, vmax: float = 0.25) -> list:
        with self.lock:
            v = self._get(vid)
            if not self.arena.inside(x, y):
                raise ValueError("Destination hors de l'aire de jeu.")
            goal = self.arena.cell_of(x, y)
            if not self.arena.free(goal):
                raise ValueError("Destination sur un obstacle.")
            v.goal, v.vmax, v.mode = goal, max(0.05, min(0.6, float(vmax))), "auto"
            v.path = self.plan(v)
            if not v.path and goal != v.held[0]:
                v.state = "attente"
                v.note = "aucun chemin libre pour l'instant"
            else:
                v.state = "route" if v.path else "arrive"
            self._event("info", f"{vid} → {goal} ({len(v.path)} cellules)", vid)
            return v.path

    def manual(self, vid: str, throttle: float, steer: float) -> dict:
        """Pilotage direct (manette). Le superviseur coupe l'avance si un autre véhicule est devant."""
        with self.lock:
            v = self._get(vid)
            v.mode, v.goal, v.path = "manuel", None, []
            v.manual = (max(-1.0, min(1.0, float(throttle))), max(-1.0, min(1.0, float(steer))))
            v.state = "manuel"
            return {"throttle": self._safe_throttle(v, v.manual[0]), "steer": v.manual[1]}

    def emergency_stop(self, vid: str | None = None) -> None:
        with self.lock:
            targets = [self._get(vid)] if vid else list(self.vehicles.values())
            if not vid:
                self.estop = True
            for v in targets:
                v.state, v.path, v.mode, v.manual = "arret", [], "auto", (0.0, 0.0)
                v.held = [self.arena.cell_of(v.x, v.y)] if not self.owner(self.arena.cell_of(v.x, v.y), v.vid) else v.held[:1]
                self._send(v.vid, {"type": "stop"})
            self._event("bad", "ARRÊT D'URGENCE " + (vid or "de toute la flotte"), vid)

    def release(self, vid: str | None = None) -> None:
        """Lève l'arrêt d'urgence ou un conflit ; les véhicules restent immobiles jusqu'au prochain ordre."""
        with self.lock:
            if vid is None:
                self.estop = False
            for v in ([self._get(vid)] if vid else self.vehicles.values()):
                if v.state in ("arret", "conflit", "bloque"):
                    v.state, v.goal, v.note = "pret", None, ""
            self._event("info", "Reprise autorisée " + (vid or "pour la flotte"), vid)

    def _get(self, vid: str) -> Vehicle:
        v = self.vehicles.get(vid)
        if not v:
            raise KeyError(f"Véhicule {vid} inconnu.")
        return v

    # ---------------------------------------------------------- planification
    def plan(self, v: Vehicle, avoid_moving: bool = False) -> list:
        start, goal = v.held[0], v.goal
        if goal is None or start == goal:
            return []
        hard = set(self.arena.obstacles)
        soft = set()
        for o in self.vehicles.values():
            if o.vid == v.vid:
                continue
            cells = self._blocked_by(o)
            if o.state in ("arrive", "pret", "arret", "perdu", "conflit", "bloque") or avoid_moving:
                hard |= cells - {goal}
            else:
                soft |= cells
        return astar(self.arena, start, goal, hard, soft)

    # ------------------------------------------------------------- cycle
    def tick(self) -> None:
        """À appeler 10 fois par seconde."""
        with self.lock:
            t = self.clock()
            for v in self.vehicles.values():
                if v.state != "perdu" and t - v.last_seen > self.stale_s:
                    v.state, v.note = "perdu", "plus de position reçue"
                    self._event("bad", f"{v.vid} injoignable : arrêt demandé, zone bloquée", v.vid)
            self._check_separation()
            for v in sorted(self.vehicles.values(), key=lambda x: x.priority):
                self._step(v, t)

    def _check_separation(self) -> None:
        vs = list(self.vehicles.values())
        for i in range(len(vs)):
            for j in range(i + 1, len(vs)):
                a, b = vs[i], vs[j]
                d = math.dist(a.pos(), b.pos())
                if d < self.min_sep_m:
                    self.violations += 1
                    for v in (a, b):
                        if v.state != "conflit":
                            v.state, v.path, v.note = "conflit", [], f"trop près de {b.vid if v is a else a.vid} ({d:.2f} m)"
                    self._event("bad", f"Séparation non respectée entre {a.vid} et {b.vid} : {d:.2f} m — arrêt des deux", a.vid)

    def _step(self, v: Vehicle, t: float) -> None:
        if self.estop or v.state in ("perdu", "conflit", "arret", "bloque"):
            self._send(v.vid, {"type": "stop"})
            return
        if v.mode == "manuel":
            thr = self._safe_throttle(v, v.manual[0])
            v.held = [self.arena.cell_of(v.x, v.y)]
            self._send(v.vid, {"type": "drive", "throttle": round(thr, 3), "steer": round(v.manual[1], 3), "lease_ms": self.lease_ms})
            return
        here = self.arena.cell_of(v.x, v.y)
        # Arrivée sur la cellule suivante : on libère l'ancienne.
        if len(v.held) == 2 and math.dist(v.pos(), self.arena.center(v.held[1])) <= self.arrive_tol:
            v.held = [v.held[1]]
            if v.path and v.path[0] == v.held[0]:
                v.path.pop(0)
        if not v.goal:
            self._send(v.vid, {"type": "stop"})
            return
        if v.held == [v.goal] and math.dist(v.pos(), self.arena.center(v.goal)) <= self.arrive_tol:
            if v.state != "arrive":
                v.state = "arrive"
                self._event("ok", f"{v.vid} arrivé en {v.goal}", v.vid)
            self._send(v.vid, {"type": "stop"})
            return
        if len(v.held) == 2:   # en transit : continuer vers la cellule réservée
            self._goto(v, v.held[1])
            return
        if not v.path:
            if t < v.pause_until:
                v.state, v.note = "attente", "laisse passer un autre véhicule"
                self._goto(v, v.held[0])
                return
            v.path = self.plan(v)
            if not v.path:
                v.state, v.note = "attente", "chemin bloqué"
                self._goto(v, v.held[0])     # se recentrer sur sa cellule
                return
        nxt = v.path[0]
        if nxt == v.held[0]:
            v.path.pop(0)
            return
        other = self.owner(nxt, exclude=v.vid)
        if other is None and self.arena.free(nxt) and abs(nxt[0] - here[0]) + abs(nxt[1] - here[1]) <= 1:
            v.held = [v.held[0], nxt]
            v.state, v.waiting_since, v.note = "route", None, ""
            self._goto(v, nxt)
            return
        # Cellule prise : attendre, puis céder (le moins prioritaire recalcule en contournant).
        if v.waiting_since is None:
            v.waiting_since = t
        v.state, v.note = "attente", f"cellule {nxt} occupée par {other}" if other else "cellule indisponible"
        self._goto(v, v.held[0])
        if t - max(v.waiting_since, v.last_yield) > self.yield_s:
            v.last_yield = t
            o = self.vehicles.get(other) if other else None
            if o is None or o.priority < v.priority or o.state in ("arrive", "pret", "perdu", "conflit", "arret", "bloque") or (o.waiting_since and t - o.waiting_since > 3 * self.yield_s):
                alt = self.plan(v, avoid_moving=True)
                if alt and alt[0] != nxt:
                    v.path = alt
                    self._event("info", f"{v.vid} contourne {other or 'un obstacle'}", v.vid)
                else:
                    # Face à face sans détour possible : s'écarter sur une cellule libre voisine, hors du
                    # chemin de l'autre, puis recalculer une fois l'autre passé.
                    side = self._side_step(v, o)
                    if side:
                        v.path = [side]
                        v.pause_until = t + 2 * self.yield_s
                        self._event("info", f"{v.vid} s'écarte en {side} pour laisser passer {other}", v.vid)

    def _side_step(self, v: Vehicle, o: Vehicle | None):
        cx, cy = v.held[0]
        avoid = set(o.path[:4]) if o else set()
        options = []
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (cx + dx, cy + dy)
            if self.arena.free(n) and self.owner(n, exclude=v.vid) is None:
                options.append((n in avoid, n))
        options.sort()
        return options[0][1] if options else None

    def _goto(self, v: Vehicle, c: tuple[int, int]) -> None:
        x, y = self.arena.center(c)
        self._send(v.vid, {"type": "goto", "x": round(x, 3), "y": round(y, 3), "vmax": v.vmax, "lease_ms": self.lease_ms})

    def _safe_throttle(self, v: Vehicle, thr: float) -> float:
        if self.estop or thr == 0:
            return 0.0
        hx, hy = math.cos(v.heading) * (1 if thr > 0 else -1), math.sin(v.heading) * (1 if thr > 0 else -1)
        for o in self.vehicles.values():
            if o.vid == v.vid:
                continue
            dx, dy = o.x - v.x, o.y - v.y
            d = math.hypot(dx, dy)
            if d < self.arena.cell_m * 2.0 and (dx * hx + dy * hy) / max(d, 1e-6) > 0.3:
                v.note = f"avance bloquée : {o.vid} devant à {d:.2f} m"
                return 0.0
        if 0 <= v.front_mm < 200 and thr > 0:
            v.note = "obstacle devant"
            return 0.0
        nx, ny = v.x + hx * 0.1, v.y + hy * 0.1
        if not self.arena.inside(nx, ny):
            v.note = "bord de l'aire de jeu"
            return 0.0
        v.note = ""
        return thr

    def _send(self, vid: str, cmd: dict) -> None:
        if self.transport:
            try:
                self.transport.send(vid, cmd)
            except Exception as e:  # le transport ne doit jamais bloquer le superviseur
                self._event("warn", f"envoi vers {vid} impossible : {e}", vid)

    # ---------------------------------------------------------- état
    def snapshot(self) -> dict:
        with self.lock:
            return {"arena": {"width_m": self.arena.cols * self.arena.cell_m, "height_m": self.arena.rows * self.arena.cell_m,
                              "cell_m": self.arena.cell_m, "cols": self.arena.cols, "rows": self.arena.rows,
                              "obstacles": sorted(self.arena.obstacles)},
                    "estop": self.estop, "violations": self.violations, "min_sep_m": self.min_sep_m,
                    "vehicles": [{"id": v.vid, "priority": v.priority, "x": round(v.x, 3), "y": round(v.y, 3),
                                  "heading": round(v.heading, 3), "state": v.state, "mode": v.mode, "goal": v.goal,
                                  "path": v.path[:40], "held": v.held, "front_mm": v.front_mm, "battery_mv": v.battery_mv,
                                  "age_s": round(self.clock() - v.last_seen, 2), "note": v.note} for v in self.vehicles.values()],
                    "events": self.events[-30:]}


def astar(arena: Arena, start, goal, hard: set, soft: set) -> list:
    """Plus court chemin 4-connexe ; `soft` coûte cher (cellules d'autres véhicules en mouvement)."""
    if goal in hard:
        return []
    openh = [(0, 0, start)]
    came = {start: None}
    cost = {start: 0}
    while openh:
        _, g, cur = heapq.heappop(openh)
        if cur == goal:
            path = []
            while cur != start:
                path.append(cur)
                cur = came[cur]
            return list(reversed(path))
        if g > cost.get(cur, 1e9):
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (cur[0] + dx, cur[1] + dy)
            if not arena.free(n) or n in hard:
                continue
            ng = g + 1 + (6 if n in soft else 0)
            if ng < cost.get(n, 1e9):
                cost[n] = ng
                came[n] = cur
                heapq.heappush(openh, (ng + abs(goal[0] - n[0]) + abs(goal[1] - n[1]), ng, n))
    return []


# ---------------------------------------------------------------- simulation
class SimTransport:
    """Véhicules simulés : appliquent les ordres GOTO/DRIVE/STOP avec bail, comme le firmware embarqué."""

    def __init__(self, fleet_clock: Callable[[], float]):
        self.clock = fleet_clock
        self.cars: dict[str, dict] = {}
        self.sent = 0

    def add(self, vid: str, x: float, y: float) -> None:
        self.cars[vid] = {"x": x, "y": y, "h": 0.0, "cmd": {"type": "stop"}, "until": 0.0, "v": 0.0}

    def send(self, vid: str, cmd: dict) -> None:
        c = self.cars.get(vid)
        if c is None:
            return
        self.sent += 1
        c["cmd"] = cmd
        c["until"] = self.clock() + cmd.get("lease_ms", 0) / 1000.0

    def step(self, dt: float) -> None:
        t = self.clock()
        for c in self.cars.values():
            cmd = c["cmd"]
            if cmd["type"] == "setpose":
                c["x"], c["y"], c["h"], c["v"] = cmd["x"], cmd["y"], cmd["heading"], 0.0
                continue
            if cmd["type"] == "stop" or t > c["until"]:
                c["v"] = 0.0
                continue
            if cmd["type"] == "goto":
                dx, dy = cmd["x"] - c["x"], cmd["y"] - c["y"]
                d = math.hypot(dx, dy)
                step = min(d, cmd.get("vmax", 0.25) * dt)
                if d > 1e-9:
                    c["x"] += dx / d * step
                    c["y"] += dy / d * step
                    c["h"] = math.atan2(dy, dx)
                c["v"] = step / dt if dt else 0
            elif cmd["type"] == "drive":
                c["h"] += cmd.get("steer", 0) * 1.5 * dt
                sp = cmd.get("throttle", 0) * 0.4
                c["x"] += math.cos(c["h"]) * sp * dt
                c["y"] += math.sin(c["h"]) * sp * dt

    def report(self, fleet: Fleet) -> None:
        for vid, c in self.cars.items():
            fleet.on_telemetry(vid, c["x"], c["y"], c["h"], c["v"])
