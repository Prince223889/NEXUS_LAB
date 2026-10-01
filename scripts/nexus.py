#!/usr/bin/env python3
"""NEXUS LAB en ligne de commande : tout ce que fait l'interface, depuis un terminal (PC, Pi ou Termux).

Réglage une fois (gardé dans ~/.nexus.json) :
    python3 scripts/nexus.py config --pi http://192.168.4.2:8088 --token <NEXUS_TOKEN> [--s3 http://192.168.4.1]

Exemples :
    nexus.py status                              état du Pi, des jobs et de Patricia
    nexus.py patricia "où en est ma serre ?"     parler à Patricia (--yes confirme ses propositions)
    nexus.py note "commander des résistances"    ajouter une note dans sa mémoire
    nexus.py notes                               lire les notes
    nexus.py projects [--q bme280]               projets connus du Pi
    nexus.py generate serre.json --out serre/    code .ino + câblage + schéma, SANS compiler (Node.js requis)
    nexus.py build serre --board esp32s3         mettre une compilation en file sur le Pi (c'est toi qui décides)
    nexus.py jobs | nexus.py job <id> --wait     suivre les jobs ; --download pour récupérer le firmware
    nexus.py apps | nexus.py apk design.json     Studio APK : lister, créer une APK (lien + QR)
    nexus.py device 192.168.4.23                 lire /api d'un montage (option « Pilotage par application »)
    nexus.py device 192.168.4.23 led=on servo=90 commander un montage (/set)
    nexus.py feeds                               mesures reçues par le MASTER
    nexus.py fleet | nexus.py stop [V3]          flotte de véhicules ; « stop » = arrêt immédiat
    nexus.py s3 /api/state                       appel brut au MASTER (GET)

Aucune dépendance : Python 3.8+ (Node.js 18+ seulement pour « generate »).
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONF = pathlib.Path(os.environ.get("NEXUS_CLI_CONFIG", str(pathlib.Path.home() / ".nexus.json")))


class Fail(Exception):
    pass


def conf() -> dict:
    c = {"pi": "", "token": "", "s3": "http://192.168.4.1"}
    try:
        c.update(json.loads(CONF.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        pass
    c["pi"] = os.environ.get("NEXUS_PI", c["pi"]).rstrip("/")
    c["token"] = os.environ.get("NEXUS_TOKEN", c["token"])
    c["s3"] = os.environ.get("NEXUS_S3", c["s3"]).rstrip("/")
    return c


def http(method: str, url: str, body=None, token: str = "", timeout: float = 20, raw: bool = False):
    data, headers = None, {"Accept": "application/json"}
    if body is not None:
        if isinstance(body, (bytes, bytearray)):
            data = bytes(body)
            headers["Content-Type"] = "application/octet-stream"
        else:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            blob = r.read()
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        try:
            text = json.loads(text).get("error", text)
        except (ValueError, AttributeError):
            pass
        raise Fail(f"{e.code} : {text[:300]}") from None
    except (urllib.error.URLError, OSError) as e:
        raise Fail(f"{url} injoignable ({getattr(e, 'reason', e)})") from None
    if raw:
        return blob
    try:
        return json.loads(blob.decode("utf-8"))
    except ValueError:
        return blob.decode("utf-8", "replace")


def pi(method: str, path: str, body=None, **kw):
    c = conf()
    if not c["pi"] or not c["token"]:
        raise Fail("Pi non configuré : nexus.py config --pi http://<ip-du-pi>:8088 --token <NEXUS_TOKEN>")
    return http(method, c["pi"] + path, body, c["token"], **kw)


def out(obj) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2))


# ---------------------------------------------------------------- commandes
def c_config(a):
    c = conf()
    for k in ("pi", "token", "s3"):
        v = getattr(a, k)
        if v:
            c[k] = v.rstrip("/") if k != "token" else v
    CONF.write_text(json.dumps(c, indent=1), encoding="utf-8")
    try:
        CONF.chmod(0o600)   # le jeton reste privé
    except OSError:
        pass
    print(f"Enregistré dans {CONF}")
    if c["pi"]:
        try:
            h = http("GET", c["pi"] + "/api/v1/health", timeout=5)
            print("Pi joignable :", h.get("status", h) if isinstance(h, dict) else h)
        except Fail as e:
            print("Pi :", e)


def c_status(a):
    h = pi("GET", "/api/v1/health")
    print(f"Pi : {'en ligne' if h.get('ok') else 'problème'} · agent {h.get('version', '?')} · {h.get('project_count', '?')} projets · arduino-cli {h.get('arduino_cli', '?')}")
    jobs = pi("GET", "/api/v1/jobs")
    items = jobs.get("items", jobs) if isinstance(jobs, dict) else jobs
    running = [j for j in items if j.get("status") in ("queued", "running")]
    print(f"Jobs : {len(items)} récents, {len(running)} en cours")
    for j in running[:5]:
        print(f"  {j['id']}  {j.get('project')}  {j.get('board')}  {j.get('stage') or j.get('status')}  {j.get('progress', 0)} %")
    try:
        hello = pi("GET", "/api/v1/patricia/hello")
        print("Patricia :", hello.get("answer", ""))
    except Fail:
        pass


def show_patricia(r: dict) -> None:
    print(r.get("answer", ""))
    for c in r.get("cards", []):
        if c.get("type") == "generate":
            print(f"  [projet] {c.get('title')} : modules {', '.join(c.get('modules', []))}")
    for a in r.get("actions", []):
        print(f"  [proposition {a.get('id')}] {a.get('summary')}  → nexus.py confirm {a.get('id')}")
    if r.get("suggestions"):
        print("  suggestions :", " · ".join(r["suggestions"]))


def c_patricia(a):
    r = pi("POST", "/api/v1/patricia/chat", {"q": " ".join(a.text), "session": "cli"}, timeout=120)
    show_patricia(r)
    if a.yes:
        for act in r.get("actions", []):
            print(f"Confirmation de {act.get('id')}…")
            out(pi("POST", f"/api/v1/patricia/actions/{act['id']}/confirm", {}, timeout=120))


def c_confirm(a):
    out(pi("POST", f"/api/v1/patricia/actions/{a.id}/{'cancel' if a.cancel else 'confirm'}", {}, timeout=120))


def c_note(a):
    r = pi("POST", "/api/v1/patricia/notes", {"text": " ".join(a.text), "project": a.project or None})
    print("Note enregistrée", r.get("id", ""))


def c_notes(a):
    m = pi("GET", "/api/v1/patricia/memory")
    q = (a.q or "").lower()
    for n in m.get("notes", []):
        title, body = n.get("title") or "", n.get("body") or ""
        line = f"- [{n.get('id')}] " + (body if not title or body.startswith(title) else f"{title} : {body}")
        if not q or q in line.lower():
            print(line)


def c_projects(a):
    if a.q:
        r = pi("GET", "/api/v1/projects/search?q=" + urllib.parse.quote(a.q))
        items = r.get("items", [])
    else:
        r = pi("GET", "/api/v1/projects")
        items = r.get("items", r) if isinstance(r, dict) else r
    for p in items[: a.limit]:
        print(f"{p.get('id', ''):32} {p.get('title') or p.get('name') or ''}")
    print(f"({len(items)} projets)")


GEN_JS = r"""
const fs = require('fs'), path = require('path');
const src = process.argv[1];
for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.js')).sort()) new Function(fs.readFileSync(path.join(src, f), 'utf8')).call(globalThis);
const spec = JSON.parse(fs.readFileSync(0, 'utf8'));
const r = LAB.generate(spec);
const m = LAB.montageSvg ? LAB.montageSvg(r, { title: r.title }) : null;
process.stdout.write(JSON.stringify({ res: r, svg: m ? m.svg : '' }));
"""


def c_generate(a):
    """Génère code + câblage + schéma depuis une spec du Studio (JSON). Ne compile rien."""
    node = shutil.which("node")
    if not node:
        raise Fail("Node.js 18+ est nécessaire pour générer le code hors interface")
    spec_text = pathlib.Path(a.spec).read_text(encoding="utf-8")
    spec = json.loads(spec_text)
    if a.board:
        spec["board"] = a.board
    p = subprocess.run([node, "-e", GEN_JS, str(ROOT / "catalog" / "src")], input=json.dumps(spec), capture_output=True, text=True, timeout=60)
    if p.returncode:
        raise Fail(p.stderr.strip().splitlines()[-1] if p.stderr.strip() else "génération impossible")
    g = json.loads(p.stdout)
    r = g["res"]
    name = r["device"] or "projet"
    d = pathlib.Path(a.out or name)
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}.ino").write_text(r["code"], encoding="utf-8")
    lines = [f"# {r['title']} — câblage ({r['boardName']})", "", "| Module | Broche | Vers | Remarque |", "|---|---|---|---|"]
    lines += [f"| {w.get('name', '')} | {w.get('pin', '')} | {w.get('to', '')} | {w.get('note', '')} |" for w in r["wiring"]]
    if r["warnings"]:
        lines += ["", "## Points d'attention", ""] + [f"- {w}" for w in r["warnings"]]
    if r.get("vars"):
        lines += ["", "## Variables", ""] + [f"- `{v['c']}` {v['label']}" + (f" ← {v['from']['module']} {v['from']['out']}" if v.get("from") else "") + (" (réglable par l'application)" if v.get("app") else "") for v in r["vars"]]
    if r.get("controls"):
        lines += ["", "## Commandes de l'application (http://<ip>/set)", ""] + [f"- `{c['key']}` : {c['name']}" for c in r["controls"]]
    (d / "MONTAGE.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if g["svg"]:
        (d / "montage.svg").write_text(g["svg"], encoding="utf-8")
    print(f"{d}/{name}.ino ({len(r['code'].splitlines())} lignes), MONTAGE.md{', montage.svg' if g['svg'] else ''}")
    for w in r["warnings"]:
        print("  !", w)
    print("Bibliothèques :", ", ".join(l["name"] for l in r["libs"]) or "aucune")
    print("Compilation : à lancer toi-même (Arduino IDE, ou nexus.py build <projet> une fois le projet enregistré sur le Pi).")


def c_build(a):
    r = pi("POST", "/api/v1/build", {"project_id": a.project, "board": a.board, "priority": a.priority})
    print(f"Compilation en file : job {r['id']}  → nexus.py job {r['id']} --wait")


def c_jobs(a):
    r = pi("GET", "/api/v1/jobs")
    for j in (r.get("items", r) if isinstance(r, dict) else r)[: a.limit]:
        print(f"{j['id']}  {j.get('status', ''):9} {j.get('kind', 'build'):8} {j.get('project', '')}  {j.get('board', '')}  {j.get('created', '')}")


def c_job(a):
    while True:
        j = pi("GET", "/api/v1/jobs/" + urllib.parse.quote(a.id))
        print(f"\r{j.get('status')} · {j.get('stage') or ''} · {j.get('progress', 0)} %   ", end="", flush=True)
        if not a.wait or j.get("status") in ("success", "failed", "canceled"):
            break
        time.sleep(3)
    print()
    if j.get("status") == "failed":
        print((j.get("log") or j.get("error") or "")[-3000:])
    if a.download and j.get("status") == "success":
        blob = pi("GET", f"/api/v1/jobs/{urllib.parse.quote(a.id)}/artifact", raw=True, timeout=120)
        target = pathlib.Path(a.download)
        target.write_bytes(blob)
        print(f"Firmware enregistré : {target} ({len(blob)} octets)")


def c_apps(a):
    r = pi("GET", "/api/v1/appstudio/apps")
    base = conf()["pi"]
    for x in r.get("items", r) if isinstance(r, dict) else r:
        lb = x.get("last_build") or {}
        print(f"{x.get('icon') or ''} {x.get('id'):24} v{x.get('version')}  {x.get('name')}  " + (base + lb["apk"] if lb.get("apk") else "(pas encore d'APK)"))


def c_apk(a):
    design = json.loads(pathlib.Path(a.design).read_text(encoding="utf-8"))
    saved = pi("POST", "/api/v1/appstudio/apps", {"design": design})
    res = pi("POST", f"/api/v1/appstudio/apps/{saved['id']}/build", {}, timeout=180)
    base = conf()["pi"]
    print(f"APK v{res['version']} ({res['package']}, signature {res['signature']})")
    print("Lien direct :", base + res["apk"])
    print("Appli web   :", base + res["web"])
    if a.qr:
        blob = pi("GET", res["qr"], raw=True)
        q = pathlib.Path(a.qr)
        q.write_bytes(blob)
        print("QR :", q)


def c_device(a):
    base = a.ip if a.ip.startswith("http") else "http://" + a.ip
    if a.cmd:
        q = urllib.parse.urlencode([tuple(c.split("=", 1)) for c in a.cmd if "=" in c])
        out(http("GET", base.rstrip("/") + "/set?" + q, timeout=8))
    else:
        r = http("GET", base.rstrip("/") + "/api", timeout=8)
        if not isinstance(r, dict):
            raise Fail("Réponse inattendue : ce montage a-t-il l'option « page web » ?")
        print(r.get("title", ""))
        for v in r.get("values", []):
            print(f"  {v['label']:40} {'—' if v['value'] is None else v['value']} {v.get('unit', '')}")
        if r.get("controls"):
            print("Commandes :", ", ".join(r["controls"]), f"→ nexus.py device {a.ip} <nom>=on|off|<nombre>")


def c_feeds(a):
    r = http("GET", conf()["s3"] + "/api/feeds", timeout=8)
    for f in r.get("feeds", r) if isinstance(r, dict) else r:
        print(f"{f.get('device', '')}/{f.get('key', '')}  {f.get('value')} {f.get('unit', '')}  ({f.get('ip', '')})")


def c_fleet(a):
    r = pi("GET", "/api/v1/fleet")
    print("ARRÊT GÉNÉRAL ACTIF" if r.get("estop") else f"Arène {r['arena']['width_m']} × {r['arena']['height_m']} m · {len(r.get('vehicles', []))} voiture(s) placée(s)")
    for v in r.get("vehicles", []):
        print(f"  {v.get('id')}  {v.get('state', '')}  x={v.get('x')} y={v.get('y')}  avant={v.get('front_mm')} mm  batt={v.get('battery_mv')} mV  {v.get('note') or ''}")
    placed = {v.get("id") for v in r.get("vehicles", [])}
    waiting = [x for x in r.get("announced", []) if x.get("id") not in placed]
    if waiting:
        print("  annoncées, à placer dans l'écran Flotte :", ", ".join(x["id"] for x in waiting))


def c_stop(a):
    out(pi("POST", "/api/v1/fleet/estop", {"vid": a.vid} if a.vid else {}, timeout=5))


def c_s3(a):
    r = http("GET", conf()["s3"] + a.path, timeout=10)
    out(r) if not isinstance(r, str) else print(r)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="nexus.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("config", help="adresse du Pi, jeton, adresse du S3")
    s.add_argument("--pi"); s.add_argument("--token"); s.add_argument("--s3"); s.set_defaults(fn=c_config)
    sp.add_parser("status", help="état du Pi, des jobs et de Patricia").set_defaults(fn=c_status)
    s = sp.add_parser("patricia", help="parler à Patricia"); s.add_argument("text", nargs="+"); s.add_argument("--yes", action="store_true", help="confirmer ses propositions"); s.set_defaults(fn=c_patricia)
    s = sp.add_parser("confirm", help="confirmer (ou --cancel) une proposition de Patricia"); s.add_argument("id"); s.add_argument("--cancel", action="store_true"); s.set_defaults(fn=c_confirm)
    s = sp.add_parser("note", help="ajouter une note"); s.add_argument("text", nargs="+"); s.add_argument("--project"); s.set_defaults(fn=c_note)
    s = sp.add_parser("notes", help="lire les notes"); s.add_argument("--q"); s.set_defaults(fn=c_notes)
    s = sp.add_parser("projects", help="projets du Pi"); s.add_argument("--q"); s.add_argument("--limit", type=int, default=400); s.set_defaults(fn=c_projects)
    s = sp.add_parser("generate", help="code + câblage depuis une spec du Studio, sans compiler"); s.add_argument("spec"); s.add_argument("--out"); s.add_argument("--board", choices=["esp32", "esp32s3", "esp32c3"]); s.set_defaults(fn=c_generate)
    s = sp.add_parser("build", help="mettre une compilation en file sur le Pi"); s.add_argument("project"); s.add_argument("--board", default="esp32"); s.add_argument("--priority", type=int, default=50); s.set_defaults(fn=c_build)
    s = sp.add_parser("jobs", help="jobs récents"); s.add_argument("--limit", type=int, default=20); s.set_defaults(fn=c_jobs)
    s = sp.add_parser("job", help="détail d'un job"); s.add_argument("id"); s.add_argument("--wait", action="store_true"); s.add_argument("--download", metavar="FICHIER"); s.set_defaults(fn=c_job)
    sp.add_parser("apps", help="applications du Studio APK").set_defaults(fn=c_apps)
    s = sp.add_parser("apk", help="créer une APK depuis une conception JSON"); s.add_argument("design"); s.add_argument("--qr", metavar="FICHIER"); s.set_defaults(fn=c_apk)
    s = sp.add_parser("device", help="lire ou commander un montage (/api, /set)"); s.add_argument("ip"); s.add_argument("cmd", nargs="*", help="nom=valeur"); s.set_defaults(fn=c_device)
    sp.add_parser("feeds", help="mesures reçues par le MASTER").set_defaults(fn=c_feeds)
    sp.add_parser("fleet", help="état de la flotte").set_defaults(fn=c_fleet)
    s = sp.add_parser("stop", help="ARRÊT immédiat de la flotte (ou d'une voiture)"); s.add_argument("vid", nargs="?"); s.set_defaults(fn=c_stop)
    s = sp.add_parser("s3", help="GET brut sur le MASTER"); s.add_argument("path"); s.set_defaults(fn=c_s3)
    a = ap.parse_args(argv)
    try:
        a.fn(a)
    except Fail as e:
        print("Erreur :", e, file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130
    except BrokenPipeError:   # sortie coupée (| head)
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
