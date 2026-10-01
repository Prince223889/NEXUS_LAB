#!/usr/bin/env python3
"""ESP32 LAB — Compilateur intelligent dédié au dossier 'catalog/classics'.
- Lit la carte de référence de chaque projet depuis classics.json.
- Trie les fichiers binaires dans SD_CARD/FIRMWARE/WORKER/<architecture>/.
- Résout le bug de dossier d'arduino-cli en créant un sous-répertoire virtuel par croquis.
- Ignore la compilation si le .bin existe déjà sur la carte SD.
- Ignore le croquis si une bibliothèque requise est indisponible.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]

# Dictionnaire de correspondance des profils de cartes officiels (FQBN)
BOARDS_MAP = {
    "esp32": "esp32:esp32:esp32",
    "esp32s3": "esp32:esp32:esp32s3",
    "esp32c3": "esp32:esp32:esp32c3"
}


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def get_installed_libs(cli: str) -> set[str]:
    """Récupère la liste des bibliothèques installées en minuscules."""
    installed = set()
    try:
        r = run([cli, "lib", "list", "--format", "json"])
        if r.returncode == 0:
            data = json.loads(r.stdout)
            items = data.get("installed_libraries", data)
            for item in items:
                name = item.get("library", {}).get("name")
                if name:
                    installed.add(name.lower().strip())
    except Exception:
        pass
    return installed


def load_classics_metadata(json_path: pathlib.Path) -> dict[str, str]:
    """Lit classics.json et associe chaque fichier .ino à sa carte de référence."""
    meta = {}
    try:
        if json_path.exists():
            data = json.loads(json_path.read_text(encoding="utf-8"))
            items = data.get("projects", data) if isinstance(data, dict) else data
            for item in items:
                src_name = item.get("src", "")
                board = item.get("board", "esp32s3").lower().strip()
                if src_name:
                    meta[pathlib.Path(src_name).stem] = board
    except Exception as e:
        print(f"[Avertissement] Impossible de lire entièrement classics.json : {e}")
    return meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="Forcer la compilation même si le .bin existe")
    ap.add_argument("--cli", default=shutil.which("arduino-cli") or "arduino-cli")
    a = ap.parse_args()

    # 1) Validation de l'environnement
    if not shutil.which(a.cli) and not pathlib.Path(a.cli).exists():
        print("[ERREUR] 'arduino-cli' introuvable dans le PATH.", file=sys.stderr)
        return 2

    classics_dir = ROOT / "catalog" / "classics"
    json_metadata = classics_dir / "classics.json"
    if not classics_dir.exists():
        print(f"[ERREUR] Le dossier {classics_dir} n'existe pas.", file=sys.stderr)
        return 1

    # Chargement de la carte de référence de chaque projet depuis le JSON
    project_boards = load_classics_metadata(json_metadata)

    # Dossier de build temporaire local pour les fichiers binaires intermédiaires
    build_root = ROOT / "build" / "classics_tmp"
    build_root.mkdir(parents=True, exist_ok=True)

    # Dossier virtuel temporaire de croquis pour plaire à arduino-cli
    virtual_sketch_root = ROOT / "build" / "virtual_sketches"
    virtual_sketch_root.mkdir(parents=True, exist_ok=True)

    # Configuration des destinations sur la SD_CARD
    sd_worker_dir = ROOT / "SD_CARD" / "FIRMWARE" / "WORKER"
    sd_worker_dir.mkdir(parents=True, exist_ok=True)

    # Chargement de l'index des dépendances installées
    installed_libs = get_installed_libs(a.cli)

    # Recherche de tous les fichiers .ino du dossier classics
    sketches = sorted(list(classics_dir.glob("*.ino")), key=lambda p: p.name)
    print(f"{len(sketches)} croquis classiques configurés.", flush=True)

    ok_count = 0
    skip_count = 0
    lib_missing_count = 0

    for ino in sketches:
        name = ino.stem
        
        # Récupération de la carte cible (défaut sur esp32s3 si absent du JSON)
        target_board_tag = project_boards.get(name, "esp32s3")
        fqbn = BOARDS_MAP.get(target_board_tag, "esp32:esp32:esp32s3")
        
        # Configuration dynamique du sous-dossier de destination (ex: WORKER/esp32s3/)
        sd_target_dir = sd_worker_dir / target_board_tag
        sd_target_dir.mkdir(parents=True, exist_ok=True)
        target_bin = sd_target_dir / f"{name}.bin"

        # --- STRATÉGIE 1 : Ignorer si déjà compilé pour cette architecture spécifique
        if not a.force and target_bin.exists():
            print(f"[IGNORÉ] {name} (Déjà présent dans SD_CARD/FIRMWARE/WORKER/{target_board_tag}/)")
            skip_count += 1
            continue

        # --- STRATÉGIE 2 : Analyse et vérification des bibliothèques requises
        missing_lib_detected = False
        try:
            content = ino.read_text(encoding="utf-8", errors="ignore")
            match = re.search(r"^// @libs:(.*)$", content, re.MULTILINE)
            if match:
                libs_needed = [l.strip() for l in match.group(1).split("|") if l.strip()]
                for lib in libs_needed:
                    lib_clean = "LiquidCrystal_I2C" if lib.lower() == "liquidcrystal i2c" else lib
                    if lib_clean.lower() not in installed_libs:
                        print(f"[PASSER] {name} ignoré car la bibliothèque '{lib}' est manquante.")
                        missing_lib_detected = True
                        break
        except Exception:
            pass

        if missing_lib_detected:
            lib_missing_count += 1
            continue

        # --- 3) DUPLICATION DANS UN DOSSIER VIRTUEL DÉDIÉ (Résout le bug de dossier d'arduino-cli)
        # On crée un dossier build/virtual_sketches/classic_blink/ et on y copie classic_blink.ino
        current_sketch_dir = virtual_sketch_root / name
        current_sketch_dir.mkdir(parents=True, exist_ok=True)
        virtual_ino_file = current_sketch_dir / ino.name
        shutil.copy2(ino, virtual_ino_file)

        print(f"[COMPILE] {name} (Cible: {target_board_tag.upper()}) ... ", end="", flush=True)
        t0 = time.time()
        project_build_dir = build_root / name
        project_build_dir.mkdir(parents=True, exist_ok=True)

        # On pointe sur le dossier virtuel dont le nom correspond exactement au fichier .ino
        r_compile = run([
            a.cli, "compile",
            "--fqbn", fqbn,
            "--build-path", str(project_build_dir),
            str(current_sketch_dir)
        ])

        if r_compile.returncode == 0:
            generated_bin = project_build_dir / f"{ino.name}.bin"
            
            if generated_bin.exists():
                shutil.copy2(generated_bin, target_bin)
                elapsed = round(time.time() - t0, 1)
                print(f"OK ({elapsed}s) -> SD_CARD/FIRMWARE/WORKER/{target_board_tag}/{name}.bin", flush=True)
                ok_count += 1
            else:
                print("ÉCHEC (Fichier binaire introuvable)", flush=True)
        else:
            print("ÉCHEC (Erreur de compilation)", flush=True)
            # Affiche l'erreur en cas de problème inattendu
            print(r_compile.stderr, file=sys.stderr)

        # Nettoyage des dossiers temporaires du projet en cours
        shutil.rmtree(project_build_dir, ignore_errors=True)
        shutil.rmtree(current_sketch_dir, ignore_errors=True)

    # Nettoyage global final
    shutil.rmtree(build_root, ignore_errors=True)
    shutil.rmtree(virtual_sketch_root, ignore_errors=True)

    print(f"\n=== BILAN COMPLET ===")
    print(f"  - Réussis (Ajoutés à la SD)  : {ok_count}")
    print(f"  - Déjà à jour (Ignorés)      : {skip_count}")
    print(f"  - Sans bibliothèques (Sautés): {lib_missing_count}")
    print(f"  - Total traités              : {len(sketches)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
