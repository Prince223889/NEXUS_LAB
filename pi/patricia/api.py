"""Routes HTTP de Patricia, branchées dans nexus_agent.py (même jeton Bearer que le reste de l'agent).

  GET  /api/v1/patricia/hello                 accueil proactif (reprise de projet, questions en attente)
  POST /api/v1/patricia/chat                  {q, session, context:{lab, project}} → réponse structurée
  POST /api/v1/patricia/actions/<id>/confirm  exécute (Pi) ou autorise (interface) une proposition
  POST /api/v1/patricia/actions/<id>/cancel
  POST /api/v1/patricia/actions/<id>/report   {ok, details, serial_log} → verdict après flash
  GET  /api/v1/patricia/actions
  POST /api/v1/patricia/diagnose              {log, kind} → constats
  POST /api/v1/patricia/verify                {log, expect[], forbid[]} → verdict
  GET  /api/v1/patricia/memory                notes, projets, faits, statistiques
  POST /api/v1/patricia/notes                 {text, title, tags, project, kind}
  POST /api/v1/patricia/notes/<id>            {title, body, tags, pinned} ; DELETE via POST {delete:true}
  POST /api/v1/patricia/projects              {id?, title, goal, board, modules, status, next_step}
  POST /api/v1/patricia/projects/<id>/delete
  POST /api/v1/patricia/facts                 {key, value} ou {key, delete:true}
  POST /api/v1/patricia/followups/<id>        {status: done|dismissed}
  GET  /api/v1/patricia/export                sauvegarde JSON complète de la mémoire
  POST /api/v1/patricia/wipe                  {what: conversations|notes|facts|followups}
  GET  /api/v1/patricia/voice                 capacités vocales du Pi
  POST /api/v1/patricia/stt                   corps = WAV 16 bits mono → {text}
  POST /api/v1/patricia/tts                   {text} → audio/wav
  GET  /api/v1/fleet                          état de la flotte
  POST /api/v1/fleet/register                 {vid, x, y, heading}
  POST /api/v1/fleet/remove                   {vid}
  POST /api/v1/fleet/arena                    {width_m, height_m, cell_m, obstacles}
  POST /api/v1/fleet/goal                     {vid, x, y, vmax}
  POST /api/v1/fleet/manual                   {vid, throttle, steer}
  POST /api/v1/fleet/estop                    {vid?}  — immédiat, sans confirmation
  POST /api/v1/fleet/release                  {vid?}
"""
from __future__ import annotations

import re
from typing import Any

from . import diagnose as diag
from . import voice
from .fleet import Arena

AID = re.compile(r"^[0-9a-f]{16}$")


def handle(h: Any, method: str, path: str, query: dict, engine, fleet_service, body_reader) -> bool:
    """Retourne True si la route appartient à Patricia ou à la flotte. `h` est le gestionnaire HTTP de l'agent."""
    if not (path.startswith("/api/v1/patricia/") or path == "/api/v1/fleet" or path.startswith("/api/v1/fleet/")):
        return False
    try:
        if method == "GET":
            return _get(h, path, query, engine, fleet_service)
        if path == "/api/v1/patricia/stt":
            length = int(h.headers.get("Content-Length", "0") or 0)
            if not 44 <= length <= voice.MAX_AUDIO:
                h.sendj(413, {"error": "Audio vide ou trop long."})
                return True
            data = h.rfile.read(length)
            h.sendj(200, {"text": voice.transcribe(data)})
            return True
        b = body_reader(h)
        return _post(h, path, b, engine, fleet_service)
    except KeyError as e:
        h.sendj(404, {"error": str(e).strip("'\"")})
    except ValueError as e:
        h.sendj(400, {"error": str(e)})
    except RuntimeError as e:
        h.sendj(503, {"error": str(e)})
    return True


def _get(h, path, q, engine, fleet_service) -> bool:
    mem = engine.mem
    if path == "/api/v1/patricia/hello":
        h.sendj(200, engine.greeting())
    elif path == "/api/v1/patricia/memory":
        h.sendj(200, {"notes": mem.notes(limit=300), "projects": mem.projects(), "facts": mem.facts(),
                      "followups": mem.due_followups(10), "stats": mem.stats(), "catalog": engine.kb.summary()})
    elif path == "/api/v1/patricia/actions":
        h.sendj(200, {"items": mem.actions(50)})
    elif path == "/api/v1/patricia/history":
        h.sendj(200, {"items": mem.history(q.get("session", [None])[0], 60)})
    elif path == "/api/v1/patricia/export":
        h.sendj(200, mem.export())
    elif path == "/api/v1/patricia/voice":
        h.sendj(200, voice.status())
    elif path == "/api/v1/fleet":
        h.sendj(200, fleet_service.snapshot() if fleet_service else {"enabled": False, "vehicles": [], "error": "Superviseur absent."})
    else:
        h.sendj(404, {"error": "Route inconnue"})
    return True


def _post(h, path, b, engine, fleet_service) -> bool:
    mem = engine.mem
    m = re.fullmatch(r"/api/v1/patricia/actions/([0-9a-f]{16})/(confirm|cancel|report)", path)
    if path == "/api/v1/patricia/chat":
        q = str(b.get("q", "")).strip()
        if not q or len(q) > 8000:
            raise ValueError("Message vide ou trop long (8000 caractères).")
        session = str(b.get("session", ""))[:40] or None
        ctx = b.get("context") if isinstance(b.get("context"), dict) else {}
        h.sendj(200, engine.chat(q, session, ctx))
    elif m:
        aid, op = m.groups()
        if op == "confirm":
            h.sendj(200, engine.confirm(aid))
        elif op == "cancel":
            engine.cancel(aid)
            h.sendj(200, {"ok": True})
        else:
            h.sendj(200, engine.report(aid, bool(b.get("ok")), b.get("details"), str(b.get("serial_log", ""))[:60000]))
    elif path == "/api/v1/patricia/diagnose":
        h.sendj(200, diag.analyze(str(b.get("log", ""))[:200000], str(b.get("kind", "auto"))))
    elif path == "/api/v1/patricia/verify":
        exp = [str(x)[:200] for x in (b.get("expect") or [])][:20]
        forb = [str(x)[:200] for x in (b.get("forbid") or [])][:20]
        for rx in exp + forb:
            re.compile(rx)
        h.sendj(200, diag.verify_run(str(b.get("log", ""))[:200000], exp, forb))
    elif path == "/api/v1/patricia/notes":
        h.sendj(201, mem.add_note(str(b.get("text", "")), str(b.get("title", "")), b.get("tags") or [], b.get("project"), str(b.get("kind", "note")), bool(b.get("pinned"))))
    elif re.fullmatch(r"/api/v1/patricia/notes/\d+", path):
        nid = int(path.rsplit("/", 1)[1])
        if b.get("delete"):
            h.sendj(200, {"ok": mem.delete_note(nid)})
        else:
            h.sendj(200, mem.update_note(nid, **{k: b[k] for k in ("title", "body", "tags", "pinned") if k in b}))
    elif path == "/api/v1/patricia/projects":
        kw = {k: b[k] for k in ("goal", "board", "modules", "status", "next_step", "improvements") if k in b}
        h.sendj(200, mem.upsert_project(str(b.get("title", "")), b.get("id") or None, **kw))
    elif re.fullmatch(r"/api/v1/patricia/projects/[a-z0-9_]{1,60}/delete", path):
        h.sendj(200, {"ok": mem.delete_project(path.split("/")[-2])})
    elif path == "/api/v1/patricia/facts":
        if b.get("delete"):
            h.sendj(200, {"ok": mem.forget(str(b.get("key", "")))})
        else:
            mem.remember(str(b.get("key", "")), str(b.get("value", "")), "interface")
            h.sendj(200, {"ok": True, "facts": mem.facts()})
    elif re.fullmatch(r"/api/v1/patricia/followups/\d+", path):
        mem.close_followup(int(path.rsplit("/", 1)[1]), str(b.get("status", "done")))
        h.sendj(200, {"ok": True})
    elif path == "/api/v1/patricia/wipe":
        h.sendj(200, {"removed": mem.wipe(str(b.get("what", "")))})
    elif path == "/api/v1/patricia/tts":
        audio = voice.synthesize(str(b.get("text", "")))
        h.send_response(200)
        h.send_header("Content-Type", "audio/wav")
        h.send_header("Content-Length", str(len(audio)))
        h.send_header("Cache-Control", "no-store")
        h.send_header("Access-Control-Allow-Origin", "*")
        h.end_headers()
        h.wfile.write(audio)
    elif path.startswith("/api/v1/fleet/"):
        _fleet(h, path, b, fleet_service)
    else:
        h.sendj(404, {"error": "Route inconnue"})
    return True


def _fleet(h, path, b, svc) -> None:
    if not svc:
        raise RuntimeError("Superviseur de flotte absent.")
    f = svc.fleet
    op = path.rsplit("/", 1)[1]
    if op == "estop":
        f.emergency_stop(b.get("vid") or None)
    elif op == "release":
        f.release(b.get("vid") or None)
    elif op == "register":
        f.register(str(b.get("vid", "")), float(b.get("x", 0)), float(b.get("y", 0)), float(b.get("heading", 0)))
    elif op == "remove":
        f.remove(str(b.get("vid", "")))
    elif op == "goal":
        if f.estop:
            raise ValueError("Arrêt d'urgence actif : lève-le d'abord.")
        f.set_goal(str(b.get("vid", "")), float(b.get("x", 0)), float(b.get("y", 0)), float(b.get("vmax", 0.25)))
    elif op == "manual":
        if f.estop:
            raise ValueError("Arrêt d'urgence actif : lève-le d'abord.")
        f.manual(str(b.get("vid", "")), float(b.get("throttle", 0)), float(b.get("steer", 0)))
    elif op == "arena":
        if any(v.state in ("route", "manuel") for v in f.vehicles.values()):
            raise ValueError("Arrête les véhicules avant de modifier l'aire de jeu.")
        w, hgt, cell = float(b.get("width_m", 4)), float(b.get("height_m", 4)), float(b.get("cell_m", 0.4))
        if not (0.5 <= w <= 50 and 0.5 <= hgt <= 50 and 0.2 <= cell <= 2):
            raise ValueError("Dimensions hors limites (0,5 à 50 m ; cellule 0,2 à 2 m).")
        obstacles = {(int(o[0]), int(o[1])) for o in (b.get("obstacles") or [])[:2000] if isinstance(o, (list, tuple)) and len(o) == 2}
        f.arena = Arena(w, hgt, cell, obstacles)
        f.min_sep_m = cell * 0.8
        for v in f.vehicles.values():
            v.held = [f.arena.cell_of(v.x, v.y)]
            v.goal, v.path = None, []
    else:
        h.sendj(404, {"error": "Route inconnue"})
        return
    h.sendj(200, svc.snapshot())
