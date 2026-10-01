#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance: sudo bash pi/configure_usb_cache.sh /dev/sda1"; exit 2; fi
DEV="${1:-}"
if [[ -z "$DEV" || ! -b "$DEV" ]]; then echo "Indique la partition exacte de la clé USB, par exemple /dev/sda1. Aucune partition ne sera formatée."; lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT; exit 2; fi
FS="$(blkid -o value -s TYPE "$DEV" || true)"; UUID="$(blkid -o value -s UUID "$DEV" || true)"
[[ -n "$UUID" ]] || { echo "La partition doit déjà avoir un système de fichiers. Formate la clé 8 Go en FAT32 avec le label NEXUS_CACHE puis relance."; exit 2; }
case "$FS" in vfat|exfat|ext4) ;; *) echo "Format $FS non pris en charge ici. Utilise FAT32 (label NEXUS_CACHE) ou ext4."; exit 2;; esac
UID_NEXUS="$(id -u nexus)"; GID_NEXUS="$(id -g nexus)"; MNT=/mnt/nexus-cache
install -d -m 0755 "$MNT"
if [[ "$FS" == vfat || "$FS" == exfat ]]; then OPTS="defaults,nofail,uid=$UID_NEXUS,gid=$GID_NEXUS,umask=0022"; else OPTS="defaults,nofail"; fi
cp -a /etc/fstab "/etc/fstab.nexus-backup.$(date +%Y%m%d%H%M%S)"
TMP_FSTAB="$(mktemp)"
awk -v mountpoint="$MNT" 'BEGIN{FS="[[:space:]]+"} $2 != mountpoint {print}' /etc/fstab > "$TMP_FSTAB"
cat "$TMP_FSTAB" > /etc/fstab
rm -f "$TMP_FSTAB"
echo "UUID=$UUID $MNT $FS $OPTS 0 2" >> /etc/fstab
mount "$MNT" 2>/dev/null || mount "$MNT"
install -d -o nexus -g nexus -m 0755 "$MNT/builds" "$MNT/gradle"
ENV=/etc/nexus/nexus.env
cp -a "$ENV" "$ENV.backup.$(date +%Y%m%d%H%M%S)"
if ! grep -q '^NEXUS_BUILDS=' "$ENV"; then echo "NEXUS_BUILDS=$MNT/builds" >> "$ENV"; fi
if ! grep -q '^GRADLE_USER_HOME=' "$ENV"; then echo "GRADLE_USER_HOME=$MNT/gradle" >> "$ENV"; fi
sed -i "s|^NEXUS_BUILDS=.*|NEXUS_BUILDS=$MNT/builds|; s|^GRADLE_USER_HOME=.*|GRADLE_USER_HOME=$MNT/gradle|" "$ENV"
systemctl restart nexus-agent
printf "Clé USB montée sur %s; aucun formatage réalisé.\n" "$MNT"
df -h "$MNT"
