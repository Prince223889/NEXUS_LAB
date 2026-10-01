#!/usr/bin/env bash
# Une seule commande pour que le Pi prépare tout à chaque démarrage (SSH, Wi-Fi du S3, agent, scripts perso) :
#   sudo bash pi/enable_boot.sh            active
#   sudo bash pi/enable_boot.sh --off      désactive (SSH reste tel quel)
# Ajoute tes propres scripts dans /etc/nexus/boot.d/NOM.sh : ils seront lancés à chaque démarrage.
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance : sudo bash pi/enable_boot.sh"; exit 2; fi
SRC="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "${1:-}" == "--off" ]]; then
  systemctl disable --now nexus-boot 2>/dev/null || true
  echo "Démarrage NEXUS désactivé."; exit 0
fi
# Hors de /opt/nexus (qui appartient à nexus) : root n'exécute que des fichiers à root.
install -d -m 0755 /usr/local/lib/nexus /etc/nexus/boot.d
install -m 0755 "$SRC/pi/nexus-boot.sh" /usr/local/lib/nexus/nexus-boot.sh
install -m 0644 "$SRC/pi/nexus-boot.service" /etc/systemd/system/nexus-boot.service
if [[ -d /etc/update-motd.d ]]; then install -m 0755 "$SRC/pi/nexus-motd.sh" /etc/update-motd.d/60-nexus; fi
systemctl daemon-reload
systemctl enable nexus-boot >/dev/null
systemctl restart nexus-boot || true
echo "Démarrage NEXUS activé : à chaque allumage, SSH + Wi-Fi du S3 + agent + /etc/nexus/boot.d/*.sh."
cat /run/nexus/boot.json 2>/dev/null || true
