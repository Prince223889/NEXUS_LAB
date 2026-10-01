#!/usr/bin/env python3
"""Répare la structure de NEXUS LAB : fichiers générés, copies, dossiers de la microSD. Ne compile aucun projet.

    python3 scripts/repair.py               répare le dépôt puis lance verify.py
    python3 scripts/repair.py --check       signale seulement ce qui est à réparer (code 1 s'il y a quelque chose)
    python3 scripts/repair.py --sd E:\\      recrée les dossiers manquants d'une microSD (S3 ou Pi) sans rien effacer

Étapes :
  1. bibliothèque (node catalog/build.js) : projects/, SD_CARD/, www/catalog.js, catalog.json ;
  2. interface du MASTER (www/app.js regroupé depuis www/src/) ;
  3. moteur des applications du Studio APK recopié dans l'APK NEXUS ;
  4. dossiers attendus sur la microSD (avec --sd) ;
  5. syntaxe Python de l'agent Pi, de Patricia et du Studio APK ;
  6. scripts/verify.py (sauf --check ou --no-verify).
"""
from __future__ import annotations

import argparse
import hashlib
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
WWW = ROOT / "firmware" / "master" / "www"
sys.path.insert(0, str(ROOT / "scripts"))
from prepare_sd import DIRS  # noqa: E402  (même liste que la préparation de la microSD)


def digest(paths: list[pathlib.Path]) -> str:
    h = hashlib.sha256()
    for p in paths:
        for f in sorted(p.rglob("*")) if p.is_dir() else [p]:
            if f.is_file():
                h.update(str(f.relative_to(ROOT)).encode())
                h.update(f.read_bytes())
    return h.hexdigest()


class Repair:
    def __init__(self, check: bool):
        self.check, self.todo, self.done = check, [], []

    def step(self, name: str, outputs: list[pathlib.Path], cmd: list[str]) -> None:
        """Lance la commande de génération et regarde si ses sorties changent (en --check, sur une copie de travail restaurée)."""
        before = digest(outputs)
        backup = {}
        if self.check:
            for p in outputs:
                if p.is_file():
                    backup[p] = p.read_bytes()
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode:
            self.todo.append(f"{name} : échec ({(r.stderr or r.stdout).strip().splitlines()[-1:] or ['?']})")
            return
        changed = digest(outputs) != before
        if self.check:
            for p, data in backup.items():
                p.write_bytes(data)
            if changed:
                self.todo.append(f"{name} : à régénérer")
        elif changed:
            self.done.append(f"{name} : régénéré")

    def sd(self, root: pathlib.Path) -> None:
        missing = [d for d in DIRS if not (root / d).is_dir()]
        for d in missing:
            if self.check:
                self.todo.append(f"microSD : dossier {d} manquant")
            else:
                (root / d).mkdir(parents=True, exist_ok=True)
                self.done.append(f"microSD : dossier {d} créé")

    def python(self) -> None:
        for f in sorted((ROOT / "pi").rglob("*.py")) + sorted((ROOT / "scripts").glob("*.py")):
            if "__pycache__" in f.parts:
                continue
            try:
                compile(f.read_text(encoding="utf-8"), str(f), "exec")
            except SyntaxError as e:
                self.todo.append(f"syntaxe Python : {f.relative_to(ROOT)} ligne {e.lineno} ({e.msg})")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="ne rien modifier, seulement signaler")
    ap.add_argument("--sd", type=pathlib.Path, help="racine d'une microSD montée (dossiers manquants recréés)")
    ap.add_argument("--no-verify", action="store_true", help="ne pas lancer scripts/verify.py à la fin")
    a = ap.parse_args()
    R = Repair(a.check)
    node = shutil.which("node")
    if node:
        R.step("Bibliothèque de projets", [ROOT / "catalog" / "catalog.json", WWW / "catalog.js"], [node, "catalog/build.js"])
    else:
        R.todo.append("Node.js 18+ absent : la bibliothèque n'a pas pu être régénérée")
    R.step("Interface du MASTER (app.js)", [WWW / "app.js"], [sys.executable, "firmware/master/tools/bundle_www.py", "firmware/master/www/src", "firmware/master/www/app.js"])
    R.step("Moteur du Studio APK dans l'APK", [ROOT / "mobile" / "app" / "src" / "main" / "assets" / "player" / "runtime.js"], [sys.executable, "scripts/sync_app_runtime.py"])
    if a.sd:
        R.sd(a.sd)
    R.python()
    for line in R.done:
        print("✓", line)
    for line in R.todo:
        print("✗", line)
    if not R.done and not R.todo:
        print("Structure en ordre : rien à réparer.")
    if a.check:
        return 1 if R.todo else 0
    if R.todo:
        return 1
    if a.no_verify:
        return 0
    print("Vérification complète (scripts/verify.py)…")
    return subprocess.run([sys.executable, str(ROOT / "scripts" / "verify.py")], cwd=ROOT).returncode


if __name__ == "__main__":
    sys.exit(main())
