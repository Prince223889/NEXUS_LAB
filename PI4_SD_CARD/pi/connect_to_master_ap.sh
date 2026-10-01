#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance: sudo bash pi/connect_to_master_ap.sh"; exit 2; fi
command -v nmcli >/dev/null || { echo "NetworkManager/nmcli est requis. Sur Raspberry Pi OS récent, active NetworkManager puis relance."; exit 2; }
SSID="${1:-}"
if [[ -z "$SSID" ]]; then read -r -p "Nom Wi-Fi du MASTER (défaut ESP32-LAB): " SSID; fi
SSID="${SSID:-ESP32-LAB}"
read -r -s -p "Mot de passe Wi-Fi affiché/configuré sur le S3: " WIFI_PASS; echo
[[ ${#WIFI_PASS} -ge 8 ]] || { echo "Mot de passe WPA2 invalide."; exit 2; }
PROFILE=nexus-master-ap
if nmcli -t -f NAME connection show | grep -Fxq "$PROFILE"; then
  nmcli connection modify "$PROFILE" 802-11-wireless.ssid "$SSID" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$WIFI_PASS"
else
  nmcli connection add type wifi ifname wlan0 con-name "$PROFILE" ssid "$SSID" >/dev/null
  nmcli connection modify "$PROFILE" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$WIFI_PASS"
fi
nmcli connection modify "$PROFILE" connection.autoconnect yes ipv4.never-default no ipv4.route-metric 600 ipv6.never-default yes
nmcli connection up "$PROFILE"
echo "Wi-Fi MASTER connecté. Adresse Pi à saisir dans Compagnon:"
ip -4 -o addr show dev wlan0 | awk '{split($4,a,"/"); print "http://" a[1] ":8088"}'
echo "Quand le Wi-Fi amont du S3 a Internet, le S3 le partage au Pi. La route Wi-Fi garde une priorité faible (600), donc Ethernet reste normalement prioritaire."
echo "Pour SSH stable, garde Ethernet branché ou utilise l’adresse Wi-Fi ci-dessus."
echo "Le S3 reste le seul à autoriser un worker; prévois jusqu'à 9 workers car le Pi prend un client sur les 10 du point d'accès."
