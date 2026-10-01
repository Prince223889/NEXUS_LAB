#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance: sudo bash pi/configure_shared_storage.sh" >&2; exit 2; fi
if ! id -u nexus >/dev/null 2>&1; then echo "L'utilisateur nexus doit être créé par install.sh." >&2; exit 2; fi
DEV="$(blkid -L NEXUS 2>/dev/null || true)"
[[ -n "$DEV" && -b "$DEV" ]] || { echo "Carte partagée absente: label FAT32 NEXUS introuvable. Prépare d'abord la microSD 64 Go depuis le Pi." >&2; exit 2; }
FS="$(blkid -s TYPE -o value "$DEV")"
[[ "$FS" == "vfat" ]] || { echo "Refus: NEXUS est en $FS, FAT32 (vfat) est requis par le S3." >&2; exit 2; }
UUID="$(blkid -s UUID -o value "$DEV")"
[[ -n "$UUID" ]] || { echo "UUID de la carte NEXUS introuvable." >&2; exit 2; }
TARGET=/srv/nexus/shared
install -d "$TARGET"
GID_NEXUS="$(id -g nexus)"
OPTS="uid=$(id -u nexus),gid=$GID_NEXUS,fmask=0117,dmask=0007,nofail,x-systemd.device-timeout=10"
BACKUP="/etc/fstab.nexus-backup.$(date +%Y%m%d%H%M%S%N)"
cp -a /etc/fstab "$BACKUP"
python3 - "$UUID" "$TARGET" "$OPTS" <<'PY'
import pathlib,sys
uuid,mount,opts=sys.argv[1:]
p=pathlib.Path('/etc/fstab')
lines=p.read_text().splitlines()
out=[]; found=False
for line in lines:
    stripped=line.strip()
    if not stripped or stripped.startswith('#'):
        out.append(line); continue
    data,sep,comment=line.partition('#'); fields=data.split()
    if len(fields)>=4 and (fields[0] == f'UUID={uuid}' or fields[1] == mount):
        if fields[2] not in ('vfat','fat','msdos'):
            raise SystemExit('La ligne fstab existante ne cible pas une partition FAT; arrêt.')
        fields[0]=f'UUID={uuid}'; fields[1]=mount; fields[2]='vfat'; fields[3]=opts
        out.append(' '.join(fields)+(('  #'+comment) if sep else '')); found=True
    else: out.append(line)
if not found: out.append(f'UUID={uuid} {mount} vfat {opts} 0 0')
p.write_text('\n'.join(out)+'\n')
PY
if ! mountpoint -q "$TARGET"; then
  if ! mount "$TARGET"; then cp -a "$BACKUP" /etc/fstab; echo "Montage impossible; fstab restauré depuis $BACKUP." >&2; exit 2; fi
fi
[[ "$(findmnt -n -o SOURCE --target "$TARGET")" == "$DEV" ]] || { cp -a "$BACKUP" /etc/fstab; echo "Le volume monté n'est pas la carte NEXUS attendue; fstab restauré." >&2; exit 2; }
mkdir -p "$TARGET/PROJECTS/LIBRARY" "$TARGET/PROJECTS/MY_PROJECTS" "$TARGET/FIRMWARE"
touch "$TARGET/.nexus-common-volume"
printf '%s\n' "$TARGET"
echo "Carte FAT32 NEXUS de 64 Go montée sur $TARGET. La carte 2 Go du S3 reste dans le S3; échanges par Wi-Fi." >&2
