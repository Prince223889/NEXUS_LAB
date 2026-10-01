#!/usr/bin/env python3
"""Recopie le moteur des applications du Studio APK vers le lecteur de l'APK.

Source unique : firmware/master/www/src/57_appruntime.js (aperçu du Studio APK sur le MASTER).
Copie : mobile/app/src/main/assets/player/runtime.js (APK NEXUS, appli web du Pi).

    python3 scripts/sync_app_runtime.py          # recopie
    python3 scripts/sync_app_runtime.py --check  # code 1 si la copie n'est pas à jour
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "firmware" / "master" / "www" / "src" / "57_appruntime.js"
DST = ROOT / "mobile" / "app" / "src" / "main" / "assets" / "player" / "runtime.js"


def main() -> int:
    data = SRC.read_bytes()
    if "--check" in sys.argv:
        ok = DST.is_file() and DST.read_bytes() == data
        print("Moteur d'application à jour." if ok else "Copie du moteur périmée : lance python3 scripts/sync_app_runtime.py")
        return 0 if ok else 1
    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_bytes(data)
    print(f"Copié : {DST.relative_to(ROOT)} ({len(data)} octets)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
