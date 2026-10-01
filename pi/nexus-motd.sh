#!/bin/sh
# Affiché à chaque connexion SSH (/etc/update-motd.d/60-nexus).
S=/run/nexus/boot.json
[ -r "$S" ] || { echo "NEXUS : démarrage en cours (sudo systemctl status nexus-boot)."; exit 0; }
python3 - "$S" <<'PY'
import json, sys
s = json.load(open(sys.argv[1]))
print(f"\n  NEXUS LAB · démarré {s['at']}")
print(f"  SSH {s['ssh']} · Wi-Fi du S3 {s['wifi']} {s['pi_ip']} · S3 {s['s3_ip']} {s['s3']} · agent {s['agent']} {s['agent_url']}")
if s.get("hooks"): print("  Scripts boot.d : " + ", ".join(s["hooks"]))
print("  Commandes : python3 ~/NEXUS_LAB/scripts/nexus.py status · journalctl -u nexus-agent -f\n")
PY
