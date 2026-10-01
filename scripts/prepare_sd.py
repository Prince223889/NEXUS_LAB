#!/usr/bin/env python3
"""ESP32 LAB — construit l'arborescence de la microSD dans SD_CARD/ (à copier à la racine d'une carte FAT32).

    python scripts/prepare_sd.py [--out SD_CARD] [--firmware chemin/vers/*.bin|*.hex ...]

Contenu : bibliothèque de projets (projects/LIBRARY), base de données du catalogue, exemples de configuration,
dossiers attendus par le MASTER, firmwares éventuellement fournis."""
from __future__ import annotations

import argparse
import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIRS = ["FIRMWARE/MASTER", "FIRMWARE/WORKER", "FIRMWARE/AVR", "PROJECTS/LIBRARY", "PROJECTS/MY_PROJECTS", "PROJECTS/IMPORTED",
        "INBOX", "COMPONENTS", "LIBRARIES", "TESTS", "REPORTS", "LOGS", "BACKUPS", "CONFIG", "DATABASE", "UPDATES", "AI"]
README = {
    "": "ESP32 LAB — carte microSD\nCopiez tout ce dossier à la racine d'une carte formatée en FAT32.\nLe MASTER recrée les dossiers manquants au démarrage.\n",
    "FIRMWARE": "Firmwares : .bin pour les workers ESP32 (mise à jour OTA depuis la page Workers),\n.hex pour les cartes Arduino (page USB & Arduino).\n",
    "PROJECTS": "LIBRARY : 320 projets du catalogue (générés).\nMY_PROJECTS : projets enregistrés depuis le Studio.\nIMPORTED : projets importés depuis INBOX.\n",
    "INBOX": "Déposez ici des dossiers de projet puis « Importer » : ils sont déplacés dans PROJECTS/IMPORTED.\n",
    "LOGS": "events.csv : journal d'événements. temperature.csv : mesures du capteur DHT du MASTER.\n",
    "REPORTS": "Rapports JSON (horaire et manuels) et historique des jobs (jobs.csv).\n",
    "AI": "memory.jsonl : historique des questions à l'assistant (pas d'entraînement).\n",
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=pathlib.Path, default=ROOT / "SD_CARD")
    ap.add_argument("--firmware", nargs="*", type=pathlib.Path, default=[])
    a = ap.parse_args()
    lib = ROOT / "projects" / "LIBRARY"
    if not lib.exists():
        print("projects/LIBRARY absent : lancez d'abord  node catalog/build.js")
        return 1
    # Add files without clearing existing card contents or local firmware.
    a.out.mkdir(parents=True, exist_ok=True)
    for d in DIRS:
        (a.out / d).mkdir(parents=True, exist_ok=True)
    for d, text in README.items():
        (a.out / d / ("LISEZMOI.txt" if d else "LISEZMOI.txt")).write_text(text, encoding="utf-8")
    shutil.copytree(lib, a.out / "PROJECTS" / "LIBRARY", dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("bin", "build", "__pycache__", ".pio", "managed_components"))
    cat = ROOT / "catalog" / "catalog.json"
    if cat.exists():
        shutil.copy2(cat, a.out / "DATABASE" / "catalog.json")
    (a.out / "CONFIG" / "lab.example.json").write_text(json.dumps({
        "_note": "Exemple uniquement : la configuration réelle se fait dans Réglages › Configuration (stockée en NVS).",
        "ap_ssid": "ESP32-LAB", "ap_channel": 6, "hostname": "esp32-lab", "sta_ssid": "", "sta_password": "",
        "timezone": "CET-1CEST,M3.5.0,M10.5.0/3", "ntp_server": "pool.ntp.org", "whatsapp_phone": "", "whatsapp_api": "",
        "webhook_url": "", "ai_endpoint": "", "ai_key": "", "ai_model": ""}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (a.out / "UPDATES" / "manifest.example.json").write_text(json.dumps({
        "version": "6.0.1", "master_url": "https://exemple.org/esp32lab/esp32_lab_master_6.0.1.bin",
        "master_sha256": "0" * 64, "notes": "Exemple de manifeste OTA (voir docs/OTA.md)"}, indent=2) + "\n", encoding="utf-8")
    for fw in a.firmware:
        dst = "AVR" if fw.suffix.lower() == ".hex" else ("MASTER" if "master" in fw.name.lower() else "WORKER")
        shutil.copy2(fw, a.out / "FIRMWARE" / dst / fw.name)
    n = sum(1 for p in (a.out / "PROJECTS" / "LIBRARY").iterdir() if p.is_dir())
    print(f"microSD prête dans {a.out} : {n} projets.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
