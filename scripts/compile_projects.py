#!/usr/bin/env python3
"""ESP32 LAB — compile les projets du catalogue avec arduino-cli (Arduino-ESP32 3.3.x).
Optimisé : Ignore les projets déjà compilés (si le fichier .bin existe).

    python scripts/compile_projects.py                       # tous les projets, carte de référence
    python scripts/compile_projects.py --only bme280,app_serre
    python scripts/compile_projects.py --board esp32s3 --jobs 4 --install-libs
    python scripts/compile_projects.py --bench               # firmwares DUT du banc fantôme
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import pathlib
import re
import shutil
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def install_libs(cli: str) -> None:
    print("Vérification et téléchargement des bibliothèques manquantes...", flush=True)
    js = ("const fs=require('fs'),p=require('path');const d=process.argv[1];"
          "for(const f of fs.readdirSync(p.join(d,'src')).sort())new Function(fs.readFileSync(p.join(d,'src',f),'utf8')).call(globalThis);"
          "console.log(JSON.stringify(Object.values(LAB.LIBS)))")
    libs = json.loads(run(["node", "-e", js, str(ROOT / "catalog")], check=True).stdout)
    for lib in libs:
        r = run([cli, "lib", "install", f"{lib['name']}@{lib['ver']}"])
        print(("OK   " if r.returncode == 0 else "ÉCHEC ") + f"{lib['name']} {lib['ver']}", flush=True)


def compile_one(cli: str, item: dict, build_root: pathlib.Path) -> dict:
    t0 = time.time()
    bp = build_root / item["name"]
    sk = pathlib.Path(item["dir"]).name + ".ino"
    
    # Détermination du fichier .bin attendu selon la structure arduino-cli
    # Généralement nommé : NomDuCroquis.ino.bin
    bin_file = bp / f"{sk}.bin"
    
    # AJOUT : Vérification si le fichier binaire existe déjà
    if bin_file.exists():
        return {
            "id": item["id"], 
            "name": item["name"], 
            "ok": True, 
            "secs": 0.0,
            "size": bin_file.stat().st_size,
            "warnings": [],
            "errors": [],
            "ignored": True
        }

    # Si le fichier .bin n'existe pas, on lance la compilation normale
    r = run([cli, "compile", "-b", item["fqbn"], "--warnings", "all", "--build-path", str(bp), item["dir"]], timeout=1200)
    out = r.stdout + r.stderr
    
    # NOTE : J'ai retiré shutil.rmtree(bp) pour conserver le fichier .bin généré sur votre disque dur
    size = re.search(r"Sketch uses (\d+) bytes", out)
    
    return {
        "id": item["id"], 
        "name": item["name"], 
        "ok": r.returncode == 0, 
        "secs": round(time.time() - t0, 1),
        "size": int(size.group(1)) if size else (bin_file.stat().st_size if bin_file.exists() else None),
        "warnings": sorted({l.strip() for l in out.splitlines() if sk in l and "warning:" in l})[:20],
        "errors": [l.strip() for l in out.splitlines() if "error:" in l or "Error during build" in l][:20],
        "ignored": False
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--board", help="esp32, esp32s3 ou esp32c3 (défaut : carte de référence de chaque projet)")
    ap.add_argument("--only", help="liste d'identifiants séparés par des virgules")
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--install-libs", action="store_true", help="installe d'abord les bibliothèques aux versions testées")
    ap.add_argument("--bench", action="store_true", help="compile les variantes « banc fantôme » des projets émulables")
    ap.add_argument("--cli", default=shutil.which("arduino-cli") or "arduino-cli")
    a = ap.parse_args()
    
    if not shutil.which(a.cli) and not pathlib.Path(a.cli).exists():
        print("arduino-cli introuvable : https://github.io")
        return 2
        
    if a.install_libs:
        install_libs(a.cli)
        
    out = ROOT / "build"
    sketches = out / "sketches"
    
    # On ne rase plus le dossier global de build pour préserver les fichiers .bin existants,
    # mais on régénère proprement l'index des sketches
    shutil.rmtree(sketches, ignore_errors=True)
    
    cmd = ["node", str(ROOT / "catalog" / "build.js"), "--sketches", str(sketches)]
    if a.board:
        cmd += ["--board", a.board]
    if a.only:
        cmd += ["--only", a.only]
    if a.bench:
        cmd += ["--bench"]
    run(cmd, check=True)
    
    items = json.loads((sketches / "index.json").read_text(encoding="utf-8"))
    print(f"{len(items)} croquis configurés ({a.jobs} en parallèle)…", flush=True)
    
    results = []
    with cf.ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for f in cf.as_completed([ex.submit(compile_one, a.cli, i, out / "cli") for i in items]):
            r = f.result()
            results.append(r)
            
            if r.get("ignored"):
                status_str = "IGNORÉ"
            elif r["ok"]:
                status_str = "OK   "
            else:
                status_str = "ERR  "
                
            print(status_str + r["name"] + (" (avertissements)" if r.get("warnings") else ""), flush=True)
            
    results.sort(key=lambda r: r["name"])
    (out / "compile_report.json").write_text(json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8")
    
    ok = sum(r["ok"] for r in results)
    md = [f"# Rapport de compilation — {ok}/{len(results)} réussis", "", "| Projet | Résultat | Taille | Remarque |", "|---|---|---|---|"]
    for r in results:
        res_icon = '✅' if r["ok"] else '❌'
        if r.get("ignored"):
            res_icon = '⏭️ (Déjà compilé)'
        md.append(f"| {r['name']} | {res_icon} | {r['size'] or ''} | {(r['errors'] or r['warnings'] or [''])[0][:120]} |")
        
    (out / "compile_report.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"\n{ok}/{len(results)} projets traités — rapport : build/compile_report.md")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
