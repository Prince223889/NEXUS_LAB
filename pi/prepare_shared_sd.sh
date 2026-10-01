#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance: sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0" >&2; exit 2; fi
[[ "${1:-}" == "--format" && -n "${2:-}" && $# -eq 2 ]] || { echo "Usage: sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0" >&2; exit 2; }
DEV="$(readlink -f -- "$2")"
[[ -b "$DEV" && "$DEV" =~ ^/dev/mmcblk[0-9]+$ && "$(lsblk -dn -o TYPE "$DEV")" == "disk" ]] || { echo "Refus: cible attendue dans le lecteur microSD interne (ex.: /dev/mmcblk0), jamais la clé USB de démarrage." >&2; exit 2; }
ROOT_SOURCE="$(findmnt -n -o SOURCE /)"
ROOT_DISKS="$(lsblk -s -nrpo PATH "$ROOT_SOURCE" 2>/dev/null || true)"
if printf '%s\n' "$ROOT_DISKS" | grep -Fxq "$DEV"; then echo "Refus: la cible contient le système de fichiers racine." >&2; exit 2; fi
BYTES="$(lsblk -dnbo SIZE "$DEV")"
(( BYTES >= 50000000000 && BYTES <= 70000000000 )) || { echo "Refus: capacité attendue pour microSD 64 Go (50 à 70 milliards d'octets), trouvé $BYTES." >&2; exit 2; }
MOUNTS="$(lsblk -nrpo MOUNTPOINT "$DEV" | sed '/^$/d')"
[[ -z "$MOUNTS" ]] || { echo "Refus: la carte a des partitions montées: $MOUNTS. Démonte-les d'abord." >&2; exit 2; }
echo "Cette opération efface entièrement $DEV ($((BYTES/1000000000)) Go). La clé USB du Pi doit rester son disque système."
lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINTS "$DEV"
read -r -p "Pour confirmer, tape exactement: EFFACER $DEV : " ANSWER
[[ "$ANSWER" == "EFFACER $DEV" ]] || { echo "Annulé; aucun changement effectué."; exit 1; }
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y dosfstools parted
wipefs -a "$DEV"
parted -s "$DEV" mklabel msdos
parted -s "$DEV" mkpart primary fat32 1MiB 100%
parted -s "$DEV" set 1 lba on
partprobe "$DEV"
udevadm settle
PART="${DEV}p1"
[[ -b "$PART" ]] || { echo "Partition créée mais périphérique $PART absent; contrôle avec lsblk avant toute suite." >&2; exit 3; }
mkfs.vfat -F 32 -n NEXUS "$PART"
sync
echo "Carte de données du Pi préparée en FAT32 (label NEXUS). Laisse-la dans le Pi et lance pi/install.sh pour y copier les projets. La carte S3 de 2 Go est distincte."
