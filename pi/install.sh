#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance ce script avec sudo."; exit 2; fi
SRC="$(cd "$(dirname "$0")/.." && pwd)"
command -v python3 >/dev/null || { echo "Python 3 manque. Installe Raspberry Pi OS Lite puis relance."; exit 2; }
if command -v apt-get >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y python3-qrcode
fi
id -u nexus >/dev/null 2>&1 || useradd --system --home-dir /var/lib/nexus --create-home --shell /usr/sbin/nologin nexus
SHARED_ROOT="$(bash "$SRC/pi/configure_shared_storage.sh")"
install -d -o nexus -g nexus -m 0750 /srv/nexus/{database,builds,firmware,packages,logs,backups,gradle}
install -d -o nexus -g nexus -m 0770 "$SHARED_ROOT"/{BUILD_CACHE,ARDUINO,PROJECTS/LIBRARY,PROJECTS/MY_PROJECTS,FIRMWARE}
install -d -m 0750 /etc/nexus
install -d -m 0755 /opt/nexus/pi /opt/nexus/catalog /opt/nexus/android-template
install -m 0644 "$SRC/pi/nexus_agent.py" /opt/nexus/pi/nexus_agent.py
# Patricia (assistante) : paquet Python à côté de l'agent ; sa mémoire vit dans /srv/nexus/patricia.
install -d -m 0755 /opt/nexus/pi/patricia
install -m 0644 "$SRC"/pi/patricia/*.py /opt/nexus/pi/patricia/
install -m 0644 "$SRC/catalog/catalog.json" /opt/nexus/catalog/catalog.json
if [[ -d "$SRC/mobile" ]]; then
  python3 -c 'import shutil,sys; shutil.copytree(sys.argv[1],sys.argv[2],dirs_exist_ok=True,ignore=shutil.ignore_patterns("build",".gradle"))' "$SRC/mobile" /opt/nexus/android-template
fi
# Preserve any existing Pi-side projects and binaries; only fill files absent on the shared FAT volume.
copy_missing() {
  local src="$1" dst="$2"
  [[ -d "$src" ]] || return 0
  python3 - "$src" "$dst" <<'PY'
import pathlib,shutil,sys
src,dst=map(pathlib.Path,sys.argv[1:]); dst.mkdir(parents=True,exist_ok=True)
for p in src.rglob('*'):
    if p.is_symlink(): continue
    rel=p.relative_to(src); q=dst/rel
    if p.is_dir(): q.mkdir(parents=True,exist_ok=True)
    elif p.is_file() and not q.exists():
        q.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,q)
PY
}
# Refuse before migrating anything if the common FAT would lose its safety reserve.
python3 - "$SHARED_ROOT" "$SRC/projects/LIBRARY" "$SRC/../SD_CARD" <<'PY'
import os,pathlib,sys
root=pathlib.Path(sys.argv[1]); pairs=[
 (pathlib.Path('/srv/nexus/projects/LIBRARY'),root/'PROJECTS/LIBRARY'),
 (pathlib.Path(sys.argv[2]),root/'PROJECTS/LIBRARY'),
 (pathlib.Path('/srv/nexus/projects/MY_PROJECTS'),root/'PROJECTS/MY_PROJECTS'),
 (pathlib.Path('/srv/nexus/firmware'),root/'FIRMWARE'),
 (pathlib.Path(sys.argv[3])/'PROJECTS',root/'PROJECTS'),
 (pathlib.Path(sys.argv[3])/'FIRMWARE',root/'FIRMWARE'),
 (pathlib.Path(sys.argv[3])/'DATABASE',root/'DATABASE'),
 (pathlib.Path(sys.argv[3])/'AI',root/'AI'),
 (pathlib.Path(sys.argv[3])/'BACKUPS',root/'BACKUPS'),
 (pathlib.Path(sys.argv[3])/'COMPONENTS',root/'COMPONENTS'),
 (pathlib.Path(sys.argv[3])/'CONFIG',root/'CONFIG'),
 (pathlib.Path(sys.argv[3])/'INBOX',root/'INBOX'),
 (pathlib.Path(sys.argv[3])/'LIBRARIES',root/'LIBRARIES'),
 (pathlib.Path(sys.argv[3])/'LOGS',root/'LOGS'),
 (pathlib.Path(sys.argv[3])/'REPORTS',root/'REPORTS'),
 (pathlib.Path(sys.argv[3])/'TESTS',root/'TESTS'),
 (pathlib.Path(sys.argv[3])/'UPDATES',root/'UPDATES'),
]
required=0; planned=set()
for src,dst in pairs:
    if not src.is_dir(): continue
    for p in src.rglob('*'):
        if p.is_symlink() or not p.is_file(): continue
        target=dst/p.relative_to(src)
        key=target.relative_to(root).as_posix().casefold()
        if not target.exists() and key not in planned:
            required+=p.stat().st_size; planned.add(key)
stat=os.statvfs(root)
free=stat.f_bavail*stat.f_frsize
reserve=64*1024*1024
if free < required+reserve:
    print(f'Espace FAT insuffisant pour migrer sans risque: {free//1048576} Mio libres, {required//1048576} Mio nécessaires et 64 Mio à garder libres.',file=sys.stderr)
    print('Aucun ancien fichier n’a été migré. Libère de la place ou archive les anciens firmwares puis relance.',file=sys.stderr)
    raise SystemExit(3)
print(f'Précontrôle FAT OK: {free//1048576} Mio libres; migration maximale {required//1048576} Mio; réserve 64 Mio.')
PY
copy_missing /srv/nexus/projects/LIBRARY "$SHARED_ROOT/PROJECTS/LIBRARY"
copy_missing "$SRC/projects/LIBRARY" "$SHARED_ROOT/PROJECTS/LIBRARY"
copy_missing /srv/nexus/projects/MY_PROJECTS "$SHARED_ROOT/PROJECTS/MY_PROJECTS"
copy_missing /srv/nexus/firmware "$SHARED_ROOT/FIRMWARE"
# If the delivery includes the S3 FAT tree, preserve its offline projects and worker firmware too.
if [[ -d "$SRC/../SD_CARD" ]]; then
  for folder in PROJECTS FIRMWARE DATABASE AI BACKUPS COMPONENTS CONFIG INBOX LIBRARIES LOGS REPORTS TESTS UPDATES; do
    copy_missing "$SRC/../SD_CARD/$folder" "$SHARED_ROOT/$folder"
  done
fi
install -d -o nexus -g nexus -m 0750 /srv/nexus/patricia /srv/nexus/database /srv/nexus/builds /srv/nexus/packages /srv/nexus/logs /srv/nexus/backups /srv/nexus/gradle
chown -R nexus:nexus /srv/nexus /opt/nexus
install -m 0644 "$SRC/pi/nexus-agent.service" /etc/systemd/system/nexus-agent.service
sed -i "s|@NEXUS_SHARED_ROOT@|$SHARED_ROOT|g" /etc/systemd/system/nexus-agent.service
if [[ ! -e /etc/nexus/nexus.env ]]; then
  TOKEN="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  cat > /etc/nexus/nexus.env <<EOF
NEXUS_TOKEN=$TOKEN
NEXUS_DATA=/srv/nexus
NEXUS_PROJECTS=$SHARED_ROOT/PROJECTS/LIBRARY
NEXUS_USER_PROJECTS=$SHARED_ROOT/PROJECTS/MY_PROJECTS
NEXUS_FIRMWARE=$SHARED_ROOT/FIRMWARE
NEXUS_SHARED_ROOT=$SHARED_ROOT
NEXUS_CATALOG=/opt/nexus/catalog/catalog.json
NEXUS_DB=/srv/nexus/database/nexus.sqlite3
NEXUS_BUILDS=$SHARED_ROOT/BUILD_CACHE
ARDUINO_DATA_DIR=$SHARED_ROOT/ARDUINO
NEXUS_BUILD_WORKERS=1
GRADLE_USER_HOME=/srv/nexus/gradle
NEXUS_APPS=/srv/nexus/apps
NEXUS_ANDROID_TEMPLATE=/opt/nexus/android-template
ANDROID_HOME=/srv/nexus/android-sdk
NEXUS_PORT=8088
ARDUINO_CLI=arduino-cli
NEXUS_APK=/srv/nexus/packages/nexus-lab.apk
NEXUS_PATRICIA_DB=/srv/nexus/patricia/memory.sqlite3
NEXUS_FLEET_KEY=
EOF
  chmod 0600 /etc/nexus/nexus.env
  echo "Jeton créé dans /etc/nexus/nexus.env. Consulte-le localement pour le saisir dans NEXUS."
else
  set_env() {
    local key="$1" value="$2"
    if grep -q "^${key}=" /etc/nexus/nexus.env; then
      sed -i "s|^${key}=.*|${key}=${value}|" /etc/nexus/nexus.env
    else
      printf '%s=%s\n' "$key" "$value" >> /etc/nexus/nexus.env
    fi
  }
  set_env NEXUS_PROJECTS "$SHARED_ROOT/PROJECTS/LIBRARY"
  set_env NEXUS_USER_PROJECTS "$SHARED_ROOT/PROJECTS/MY_PROJECTS"
  set_env NEXUS_FIRMWARE "$SHARED_ROOT/FIRMWARE"
  set_env NEXUS_SHARED_ROOT "$SHARED_ROOT"
  set_env NEXUS_BUILDS "$SHARED_ROOT/BUILD_CACHE"
  set_env ARDUINO_DATA_DIR "$SHARED_ROOT/ARDUINO"
fi
systemctl daemon-reload
systemctl enable --now nexus-agent
if [[ -f "$SRC/packages/nexus-lab.apk" ]]; then install -o nexus -g nexus -m 0640 "$SRC/packages/nexus-lab.apk" /srv/nexus/packages/nexus-lab.apk; fi
echo "microSD de 64 Go du Pi montée: $SHARED_ROOT. La microSD 2 Go du S3 reste dans le S3; les appareils échangent par Wi-Fi."
echo "NEXUS-AGENT installé. Santé: curl http://127.0.0.1:8088/api/v1/health"
echo "Arduino CLI: $(command -v arduino-cli || printf absent)."
echo "Patricia : sudo bash pi/setup_patricia.sh --ollama --voice --fleet ajoute l'IA locale, la voix hors ligne et la clé de flotte."
