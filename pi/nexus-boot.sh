#!/usr/bin/env bash
# Lancé à chaque démarrage du Pi par nexus-boot.service (root) :
#   1. SSH actif (pour travailler depuis le PC) ;
#   2. connexion au point d'accès du S3 (profil nexus-master-ap créé par connect_to_master_ap.sh) ;
#   3. agent NEXUS (et Patricia) démarré puis contrôlé ;
#   4. scripts personnels de /etc/nexus/boot.d/*.sh exécutés dans l'ordre ;
#   5. état écrit dans /run/nexus/boot.json et affiché à chaque connexion SSH.
# Ne compile rien. Relance manuelle : sudo systemctl restart nexus-boot   Journal : journalctl -u nexus-boot
set -uo pipefail
STATUS_DIR="${NEXUS_BOOT_STATUS_DIR:-/run/nexus}"
STATUS="$STATUS_DIR/boot.json"
ENV=/etc/nexus/nexus.env
S3_IP="${NEXUS_S3_IP:-192.168.4.1}"
PORT=8088
[[ -r "$ENV" ]] && PORT="$(sed -n 's/^NEXUS_PORT=//p' "$ENV" | tail -1)"; PORT="${PORT:-8088}"
mkdir -p "$STATUS_DIR"; chmod 0755 "$STATUS_DIR"
log() { echo "nexus-boot: $*"; }

ssh_state=absent
if systemctl list-unit-files ssh.service >/dev/null 2>&1; then
  systemctl enable --now ssh >/dev/null 2>&1 && ssh_state=actif || ssh_state=erreur
fi
log "SSH $ssh_state"

wifi_state=absent pi_ip=""
if command -v nmcli >/dev/null && nmcli -t -f NAME connection show 2>/dev/null | grep -Fxq nexus-master-ap; then
  wifi_state=injoignable
  for i in 1 2 3 4 5 6; do
    if nmcli -w 20 connection up nexus-master-ap >/dev/null 2>&1; then wifi_state=connecté; break; fi
    log "point d'accès du S3 pas encore là (essai $i/6)"; sleep 10
  done
fi
pi_ip="$(ip -4 -o addr show dev wlan0 2>/dev/null | awk '{split($4,a,"/"); print a[1]; exit}')"
log "Wi-Fi S3 $wifi_state ${pi_ip:-}"

s3_state=injoignable
for i in 1 2 3; do
  if curl -fsS -m 3 "http://$S3_IP/api/health" >/dev/null 2>&1; then s3_state=joignable; break; fi
  sleep 3
done
log "S3 $S3_IP $s3_state"

systemctl start nexus-agent >/dev/null 2>&1 || true
agent_state=arrêté
for i in $(seq 1 20); do
  if curl -fsS -m 2 "http://127.0.0.1:$PORT/api/v1/health" >/dev/null 2>&1; then agent_state=actif; break; fi
  sleep 2
done
log "agent $agent_state"

hooks=()
if [[ -d /etc/nexus/boot.d ]]; then
  for f in /etc/nexus/boot.d/*.sh; do
    [[ -f "$f" ]] || continue
    if timeout 300 bash "$f"; then hooks+=("$(basename "$f"):ok"); else hooks+=("$(basename "$f"):erreur"); fi
  done
fi

python3 - "$STATUS" "$ssh_state" "$wifi_state" "$pi_ip" "$S3_IP" "$s3_state" "$agent_state" "$PORT" "${hooks[@]}" <<'PY'
import json, sys, time
out, ssh, wifi, ip, s3ip, s3, agent, port, *hooks = sys.argv[1:]
json.dump({"at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "ssh": ssh, "wifi": wifi, "pi_ip": ip, "s3_ip": s3ip,
           "s3": s3, "agent": agent, "agent_url": f"http://{ip}:{port}" if ip else "", "hooks": hooks},
          open(out, "w"), ensure_ascii=False, indent=1)
PY
chmod 0644 "$STATUS"
exit 0
