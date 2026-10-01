#!/usr/bin/env bash
# Patricia — options du Raspberry Pi 4 (4 Go). À lancer APRÈS pi/install.sh.
#   --ollama [modèle]  IA locale hors ligne via Ollama (modèle par défaut : qwen2.5:1.5b, ~1 Go)
#   --voice            reconnaissance vocale Vosk (français) + synthèse Piper (voix siwis)
#   --fleet            crée la clé de flotte NEXUS_FLEET_KEY (à recopier dans firmware/vehicle/config.h)
# Nécessite Internet pendant l'installation seulement ; tout fonctionne ensuite hors ligne.
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance avec sudo : sudo bash pi/setup_patricia.sh --ollama --voice --fleet"; exit 2; fi
[[ -f /etc/nexus/nexus.env ]] || { echo "Lance d'abord pi/install.sh."; exit 2; }
WANT_OLLAMA=0; WANT_VOICE=0; WANT_FLEET=0; MODEL="qwen2.5:1.5b"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ollama) WANT_OLLAMA=1; if [[ "${2:-}" != "" && "${2:0:2}" != "--" ]]; then MODEL="$2"; shift; fi ;;
    --voice) WANT_VOICE=1 ;;
    --fleet) WANT_FLEET=1 ;;
    *) echo "Option inconnue : $1"; exit 2 ;;
  esac
  shift
done
set_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" /etc/nexus/nexus.env; then sed -i "s|^${key}=.*|${key}=${value}|" /etc/nexus/nexus.env
  else printf '%s=%s\n' "$key" "$value" >> /etc/nexus/nexus.env; fi
}
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
FREE_MB=$(df -Pm /srv/nexus | awk 'NR==2 {print $4}')
echo "RAM : ${MEM_MB} Mo · espace libre sur /srv/nexus : ${FREE_MB} Mo"

if [[ $WANT_OLLAMA -eq 1 ]]; then
  if [[ "$FREE_MB" -lt 2500 ]]; then echo "Il faut au moins 2,5 Go libres sur la clé USB pour Ollama et le modèle."; exit 3; fi
  if [[ "$MEM_MB" -lt 3500 && "$MODEL" != *"0.5b"* ]]; then echo "Moins de 4 Go de RAM : utilise --ollama qwen2.5:0.5b"; fi
  command -v ollama >/dev/null || curl -fsSL https://ollama.com/install.sh | sh
  install -d -o ollama -g ollama -m 0750 /srv/nexus/ollama 2>/dev/null || install -d -m 0755 /srv/nexus/ollama
  install -d /etc/systemd/system/ollama.service.d
  cat > /etc/systemd/system/ollama.service.d/nexus.conf <<CONF
[Service]
Environment=OLLAMA_MODELS=/srv/nexus/ollama
Environment=OLLAMA_HOST=127.0.0.1:11434
Environment=OLLAMA_KEEP_ALIVE=30m
Environment=OLLAMA_NUM_PARALLEL=1
Environment=OLLAMA_MAX_LOADED_MODELS=1
CONF
  chown -R ollama:ollama /srv/nexus/ollama 2>/dev/null || true
  systemctl daemon-reload; systemctl enable --now ollama; sleep 3
  ollama pull "$MODEL"
  set_env NEXUS_AI_ENDPOINT "http://127.0.0.1:11434/v1/chat/completions"
  set_env NEXUS_AI_MODEL "$MODEL"
  echo "IA locale prête : $MODEL. Une compilation et l'IA en même temps peuvent saturer les 4 Go : garde NEXUS_BUILD_WORKERS=1."
fi

if [[ $WANT_VOICE -eq 1 ]]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv unzip curl
  [[ -x /opt/nexus/venv/bin/python3 ]] || python3 -m venv --system-site-packages /opt/nexus/venv
  /opt/nexus/venv/bin/pip install --upgrade vosk
  install -d -m 0755 /opt/nexus/voice
  cd /opt/nexus/voice
  if [[ ! -d vosk-model-small-fr-0.22 ]]; then curl -fL -o fr.zip https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip && unzip -q fr.zip && rm fr.zip; fi
  ARCH="$(uname -m)"; [[ "$ARCH" == "aarch64" ]] || echo "Architecture $ARCH : adapte l'archive Piper si besoin."
  if [[ ! -x piper/piper ]]; then curl -fL -o piper.tgz "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_${ARCH}.tar.gz" && tar xzf piper.tgz && rm piper.tgz; fi
  for f in fr_FR-siwis-medium.onnx fr_FR-siwis-medium.onnx.json; do
    [[ -f "$f" ]] || curl -fL -o "$f" "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/siwis/medium/$f"
  done
  sed -i 's|^ExecStart=/usr/bin/python3 |ExecStart=/opt/nexus/venv/bin/python3 |' /etc/systemd/system/nexus-agent.service
  echo "Bonjour, je suis Patricia." | ./piper/piper --model fr_FR-siwis-medium.onnx --output_file /tmp/patricia-test.wav && echo "Synthèse vocale OK (/tmp/patricia-test.wav)."
fi

if [[ $WANT_FLEET -eq 1 ]]; then
  CUR="$(grep '^NEXUS_FLEET_KEY=' /etc/nexus/nexus.env | cut -d= -f2-)"
  if [[ ${#CUR} -lt 16 ]]; then CUR="$(python3 -c 'import secrets; print(secrets.token_urlsafe(18))')"; set_env NEXUS_FLEET_KEY "$CUR"; fi
  echo "Clé de flotte : recopie-la dans firmware/vehicle/config.h (#define FLEET_KEY) de CHAQUE voiture."
  echo "  sudo grep NEXUS_FLEET_KEY /etc/nexus/nexus.env"
fi

systemctl daemon-reload
systemctl restart nexus-agent
echo "Patricia redémarrée. Vérifie : curl -s -H \"Authorization: Bearer <jeton>\" http://127.0.0.1:8088/api/v1/patricia/voice"
