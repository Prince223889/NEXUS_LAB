#!/usr/bin/env python3
"""Concatène www/src/*.js (ordre alphabétique) en un seul fichier app.js.

    python tools/bundle_www.py <dossier src> <fichier de sortie>

Appelé par le build CMake ; peut aussi être lancé à la main pour tester l'interface hors carte."""
import pathlib
import sys


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    parts = sorted(p for p in src.glob("*.js"))
    if not parts:
        print(f"aucun fichier .js dans {src}", file=sys.stderr)
        return 1
    chunks = [f"/* ESP32 LAB — app.js généré depuis www/src ({len(parts)} fichiers). Ne pas modifier : éditez www/src. */\n"]
    for p in parts:
        chunks.append(f"/* ---- {p.name} ---- */\n")
        chunks.append(p.read_text(encoding="utf-8").rstrip() + "\n")
    data = "".join(chunks)
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists() or out.read_text(encoding="utf-8") != data:
        out.write_text(data, encoding="utf-8", newline="\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
