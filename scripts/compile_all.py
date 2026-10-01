#!/usr/bin/env python3
"""ESP32 LAB — compile TOUS les projets et range les firmwares dans leurs dossiers.

    python scripts/compile_all.py                      # tout (ESP32, ESP32-S3, ESP32-C3, Arduino)
    python scripts/compile_all.py --targets esp32      # une seule carte
    python scripts/compile_all.py --targets arduino    # seulement les projets Arduino de capteurs/
    python scripts/compile_all.py --only bme280,app_serre --jobs 4
    python scripts/compile_all.py --no-sd              # ne pas recopier vers SD_CARD/

Résultat :
  projects/LIBRARY/<projet>/bin/<carte>/   <projet>.bin (application, pour la mise à jour d'un worker par Wi-Fi)
                                           <projet>.bootloader.bin, <projet>.partitions.bin, boot_app0.bin
                                           flash_args (adresses : utilisé par le flash USB du MASTER)
  projects/LIBRARY/<projet>/montage*.svg   schéma de câblage de chaque carte (généré par catalog/build.js)
  capteurs/<projet>/<projet>.hex           firmware Arduino Uno / Nano (ATmega328P)
  SD_CARD/PROJECTS/LIBRARY/…  et  SD_CARD/PROJECTS/ARDUINO/…   copie prête pour la microSD
  SD_CARD/FIRMWARE/WORKER/<carte>__<projet>__bench.ino.bin     firmwares du banc fantôme
  build/compile_all_report.md              rapport (✅ / ❌ + première erreur)

Compilation incrémentale : un projet déjà compilé et plus récent que son .ino est ignoré (--force pour tout refaire).
Nécessite arduino-cli (cœurs esp32:esp32 3.3.x et arduino:avr) et Node.js."""
from __future__ import annotations

import argparse
import hashlib
import concurrent.futures as cf
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
LIB = ROOT / "projects" / "LIBRARY"
CAPTEURS = ROOT / "capteurs"
BUILD = ROOT / "build"
SD = ROOT / "SD_CARD"
BOARDS = ("esp32", "esp32s3", "esp32c3")
AVR_FQBN = "arduino:avr:uno"
print_lock = threading.Lock()


def say(msg: str) -> None:
    with print_lock:
        print(msg, flush=True)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)


def find_cli(explicit: str | None) -> str:
    for c in [explicit, shutil.which("arduino-cli"), str(pathlib.Path.home() / "Downloads" / "arduino-cli.exe")]:
        if c and (shutil.which(c) or pathlib.Path(c).exists()):
            return c
    sys.exit("arduino-cli introuvable : installez-le (https://arduino.github.io/arduino-cli/) ou passez --cli <chemin>.")


# ---------------------------------------------------------------- bibliothèques

def install_libs(cli: str) -> None:
    say("== Bibliothèques Arduino (versions validées du catalogue + projets capteurs/)")
    js = ("const fs=require('fs'),p=require('path');const d=process.argv[1];"
          "for(const f of fs.readdirSync(p.join(d,'src')).sort())new Function(fs.readFileSync(p.join(d,'src',f),'utf8')).call(globalThis);"
          "console.log(JSON.stringify(Object.values(LAB.LIBS)))")
    wanted: dict[str, str | None] = {}
    r = run(["node", "-e", js, str(ROOT / "catalog")])
    if r.returncode == 0:
        for lib in json.loads(r.stdout):
            wanted[lib["name"]] = lib.get("ver")
    for ino in CAPTEURS.glob("*/*.ino"):
        m = re.search(r"^// @libs:(.*)$", ino.read_text(encoding="utf-8", errors="ignore"), re.M)
        if m:
            for name in (x.strip() for x in m.group(1).split("|")):
                if name:
                    wanted.setdefault(name, None)
    installed = run([cli, "lib", "list", "--format", "json"])
    have = set()
    try:
        data = json.loads(installed.stdout or "{}")
        items = data.get("installed_libraries", data) if isinstance(data, dict) else data
        for it in items or []:
            lib = it.get("library", it)
            have.add((lib.get("name") or "").lower())
    except (ValueError, AttributeError):
        pass
    for name, ver in sorted(wanted.items()):
        if name.lower() in have:
            continue
        spec = f"{name}@{ver}" if ver else name
        r = run([cli, "lib", "install", spec])
        if r.returncode != 0 and ver:  # version introuvable : dernière version
            r = run([cli, "lib", "install", name])
        say(("  installée  " if r.returncode == 0 else "  ÉCHEC     ") + spec)


# ---------------------------------------------------------------- ESP32

def sketches_for(board: str, only: list[str] | None) -> list[dict]:
    out = BUILD / f"sketches_{board}"
    shutil.rmtree(out, ignore_errors=True)
    cmd = ["node", str(ROOT / "catalog" / "build.js"), "--sketches", str(out), "--board", board]
    if only:
        cmd += ["--only", ",".join(only)]
    r = run(cmd)
    if r.returncode != 0:
        sys.exit("génération des croquis impossible :\n" + r.stderr)
    items = json.loads((out / "index.json").read_text(encoding="utf-8"))
    for it in items:
        it["board"] = board
    return items


def bench_sketches(board: str, only: list[str] | None) -> list[dict]:
    out = BUILD / f"sketches_{board}_bench"
    shutil.rmtree(out, ignore_errors=True)
    cmd = ["node", str(ROOT / "catalog" / "build.js"), "--sketches", str(out), "--board", board, "--bench"]
    if only:
        cmd += ["--only", ",".join(only)]
    if run(cmd).returncode != 0:
        return []
    items = json.loads((out / "index.json").read_text(encoding="utf-8"))
    for it in items:
        it["board"] = board
        it["bench"] = True
    return items


def first_error(text: str) -> str:
    for line in text.splitlines():
        if "error:" in line or "Error during build" in line or "fatal error" in line:
            return line.strip()[:220]
    return (text.strip().splitlines() or [""])[-1][:220]


def compile_esp(cli: str, it: dict, force: bool) -> dict:
    board, pid, name = it["board"], it["id"], it["name"]
    bp = BUILD / "cli" / name
    sketch_dir = pathlib.Path(it["dir"])
    ino = sketch_dir / f"{name}.ino"
    app = bp / f"{name}.ino.bin"
    dest = LIB / pid / "bin" / board
    res = {"id": pid, "board": board, "name": name, "ok": False, "skipped": False, "error": "", "size": 0, "bench": it.get("bench", False)}
    # Incrémental : le code généré n'a pas changé et le binaire existe déjà
    stamp = bp / "sketch.sha"
    code = ino.read_bytes()
    digest = hashlib.sha1(code + it['fqbn'].encode()).hexdigest()
    if not force and app.exists() and stamp.exists() and stamp.read_text() == digest:
        res.update(ok=True, skipped=True, size=app.stat().st_size)
    else:
        t0 = time.time()
        r = None
        for attempt in range(2):  # une relance : les erreurs 0xffffffff de Windows sont souvent passagères
            r = run([cli, "compile", "-b", it["fqbn"], "--build-path", str(bp), str(sketch_dir)], timeout=1800)
            if r.returncode == 0:
                break
            time.sleep(2)
        if r.returncode != 0 or not app.exists():
            res["error"] = first_error(r.stdout + r.stderr)
            return res
        stamp.write_text(digest)
        res.update(ok=True, size=app.stat().st_size, secs=round(time.time() - t0, 1))
    if it.get("bench"):
        target = SD / "FIRMWARE" / "WORKER" / f"{name}.ino.bin"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(app, target)
        return res
    # Rangement dans le dossier du projet, avec flash_args réécrit pour les nouveaux noms
    dest.mkdir(parents=True, exist_ok=True)
    rename = {f"{name}.ino.bin": f"{pid}.bin", f"{name}.ino.bootloader.bin": f"{pid}.bootloader.bin",
              f"{name}.ino.partitions.bin": f"{pid}.partitions.bin", "boot_app0.bin": "boot_app0.bin"}
    for src, dst in rename.items():
        if (bp / src).exists():
            shutil.copy2(bp / src, dest / dst)
    fa = bp / "flash_args"
    if fa.exists():
        text = fa.read_text(encoding="utf-8", errors="ignore")
        for src, dst in rename.items():
            text = text.replace(src, dst)
        (dest / "flash_args").write_text(text.replace("\r\n", "\n"), encoding="utf-8")
    return res


# ---------------------------------------------------------------- Arduino (capteurs/)

def compile_avr(cli: str, folder: pathlib.Path, force: bool) -> dict:
    name = folder.name
    ino = folder / f"{name}.ino"
    hexf = folder / f"{name}.hex"
    res = {"id": name, "board": "arduino", "name": name, "ok": False, "skipped": False, "error": "", "size": 0}
    if not ino.exists():
        res["error"] = "fichier .ino absent"
        return res
    if not force and hexf.exists() and hexf.stat().st_mtime >= ino.stat().st_mtime:
        res.update(ok=True, skipped=True, size=hexf.stat().st_size)
        return res
    bp = BUILD / "avr" / name
    r = run([cli, "compile", "-b", AVR_FQBN, "--build-path", str(bp), str(folder)], timeout=900)
    out = bp / f"{name}.ino.hex"
    if r.returncode != 0 or not out.exists():
        res["error"] = first_error(r.stdout + r.stderr)
        return res
    shutil.copy2(out, hexf)
    res.update(ok=True, size=hexf.stat().st_size)
    return res


# ---------------------------------------------------------------- microSD

def mirror(src: pathlib.Path, dst: pathlib.Path) -> int:
    """Copie incrémentale (taille + date) ; renvoie le nombre de fichiers copiés."""
    n = 0
    for f in src.rglob("*"):
        if f.is_dir():
            continue
        t = dst / f.relative_to(src)
        if t.exists() and t.stat().st_size == f.stat().st_size and t.stat().st_mtime >= f.stat().st_mtime:
            continue
        t.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, t)
        n += 1
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--targets", default="esp32,esp32s3,esp32c3,arduino")
    ap.add_argument("--only", help="identifiants séparés par des virgules")
    ap.add_argument("--jobs", type=int, default=max(1, min(4, (os.cpu_count() or 2) - 1)))
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--no-libs", action="store_true", help="ne pas installer les bibliothèques manquantes")
    ap.add_argument("--no-sd", action="store_true", help="ne pas recopier vers SD_CARD/")
    ap.add_argument("--no-bench", action="store_true", help="ne pas compiler les firmwares du banc fantôme")
    ap.add_argument("--cli")
    a = ap.parse_args()
    cli = find_cli(a.cli)
    targets = [t.strip() for t in a.targets.split(",") if t.strip()]
    only = a.only.split(",") if a.only else None
    t_start = time.time()

    say(f"arduino-cli : {cli}")
    say("== Génération du catalogue (projets, montages, plans de banc)")
    r = run(["node", str(ROOT / "catalog" / "build.js")])
    say(r.stdout.strip() or r.stderr.strip())
    if not a.no_libs:
        install_libs(cli)

    results: list[dict] = []
    for board in [b for b in targets if b in BOARDS]:
        items = sketches_for(board, only)
        if not a.no_bench:
            items += bench_sketches(board, only)
        say(f"== {board} : {len(items)} croquis ({a.jobs} en parallèle)")
        done = 0
        with cf.ThreadPoolExecutor(max_workers=a.jobs) as ex:
            futs = [ex.submit(compile_esp, cli, it, a.force) for it in items]
            for f in cf.as_completed(futs):
                res = f.result()
                results.append(res)
                done += 1
                tag = "IGNORÉ" if res["skipped"] else ("OK    " if res["ok"] else "ERREUR")
                say(f"  [{done:3}/{len(items)}] {tag} {res['name']}" + (f" — {res['error']}" if res["error"] else ""))

    if "arduino" in targets and CAPTEURS.exists():
        folders = sorted(p for p in CAPTEURS.iterdir() if p.is_dir() and (not only or p.name in only))
        say(f"== Arduino Uno/Nano : {len(folders)} projets de capteurs/")
        with cf.ThreadPoolExecutor(max_workers=a.jobs) as ex:
            for i, res in enumerate(ex.map(lambda p: compile_avr(cli, p, a.force), folders), 1):
                results.append(res)
                tag = "IGNORÉ" if res["skipped"] else ("OK    " if res["ok"] else "ERREUR")
                say(f"  [{i:3}/{len(folders)}] {tag} {res['name']}" + (f" — {res['error']}" if res["error"] else ""))

    if not a.no_sd:
        say("== Copie vers SD_CARD/")
        n = mirror(LIB, SD / "PROJECTS" / "LIBRARY")
        if CAPTEURS.exists():
            n += mirror(CAPTEURS, SD / "PROJECTS" / "ARDUINO")
        say(f"  {n} fichier(s) copié(s)")

    ok = sum(r["ok"] for r in results)
    lines = [f"# Compilation de tous les projets — {ok}/{len(results)} réussis", "",
             f"Durée : {round((time.time() - t_start) / 60, 1)} min — {time.strftime('%Y-%m-%d %H:%M')}", "",
             "| Projet | Carte | Résultat | Taille | Erreur |", "|---|---|---|---|---|"]
    for r in sorted(results, key=lambda x: (x["board"], x["id"], x.get("bench", False))):
        res = "✅" if r["ok"] else "❌"
        lines.append(f"| {r['id']}{' (banc)' if r.get('bench') else ''} | {r['board']} | {res} | {r['size'] or ''} | {r['error'].replace('|', '/')} |")
    BUILD.mkdir(exist_ok=True)
    (BUILD / "compile_all_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (BUILD / "compile_all_report.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    failed = [r for r in results if not r["ok"]]
    say(f"\n{ok}/{len(results)} réussis — rapport : build/compile_all_report.md")
    for r in failed[:40]:
        say(f"  ❌ {r['board']:8} {r['id']} : {r['error']}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
