#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance avec sudo: sudo bash pi/setup_arduino.sh"; exit 2; fi
apt-get update
apt-get install -y curl ca-certificates
install -d -m 0755 /usr/local/bin
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh
CLI=/usr/local/bin/arduino-cli
NEXUS_HOME="$(getent passwd nexus | cut -d: -f6)"
[[ -n "$NEXUS_HOME" ]] || { echo "Utilisateur nexus absent: lance d'abord pi/install.sh"; exit 2; }
SHARED_ROOT="$(grep "^NEXUS_SHARED_ROOT=" /etc/nexus/nexus.env | cut -d= -f2-)"
ARDUINO_DATA_DIR="$(grep "^ARDUINO_DATA_DIR=" /etc/nexus/nexus.env | cut -d= -f2-)"
if [[ -z "$ARDUINO_DATA_DIR" ]]; then ARDUINO_DATA_DIR="$SHARED_ROOT/ARDUINO"; fi
[[ -d "$SHARED_ROOT" && -w "$SHARED_ROOT" ]] || { echo "Carte NEXUS non montée ou non inscriptible sur $SHARED_ROOT; lance d'abord pi/install.sh."; exit 2; }
install -d -o nexus -g nexus -m 0770 "$ARDUINO_DATA_DIR" "$NEXUS_HOME/.arduino15" 
sudo -u nexus env HOME="$NEXUS_HOME" "$CLI" config init --overwrite
sudo -u nexus env HOME="$NEXUS_HOME" "$CLI" config set directories.data "$ARDUINO_DATA_DIR"
sudo -u nexus env HOME="$NEXUS_HOME" "$CLI" config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
sudo -u nexus env HOME="$NEXUS_HOME" "$CLI" core update-index
sudo -u nexus env HOME="$NEXUS_HOME" "$CLI" core install esp32:esp32
sudo -u nexus env HOME="$NEXUS_HOME" "$CLI" core list
systemctl restart nexus-agent
systemctl --no-pager --full status nexus-agent
