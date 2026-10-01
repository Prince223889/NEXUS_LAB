#!/usr/bin/env bash
set -euo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Lance avec sudo: sudo bash pi/setup_android_build.sh"; exit 2; fi
ARCH="$(dpkg --print-architecture)"
if [[ "$ARCH" != "amd64" ]]; then
  cat >&2 <<EOF
La génération Android Gradle standard est bloquée sur $ARCH.
Le Pi 4 utilise normalement ARM64; les outils Android Linux (dont AAPT2) publiés par Google ciblent x86_64.
Le service NEXUS garde la file et les projets; pour fabriquer une APK sur ce Pi, il faut un constructeur ARM64 compatible ou un worker Android x86_64 distant.
Aucun faux APK ne sera produit. Le firmware ESP32 se compile normalement sur le Pi ARM64 avec setup_arduino.sh.
EOF
  exit 3
fi
apt-get update
apt-get install -y curl unzip openjdk-17-jdk python3-qrcode python3-pil
SDK=/srv/nexus/android-sdk
install -d -o nexus -g nexus -m 0750 "$SDK/cmdline-tools"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
curl -fL https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip -o "$TMP/tools.zip"
unzip -q "$TMP/tools.zip" -d "$TMP"
install -d -o nexus -g nexus -m 0750 "$SDK/cmdline-tools/latest"
cp -a "$TMP/cmdline-tools/." "$SDK/cmdline-tools/latest/"
chown -R nexus:nexus "$SDK"
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" --licenses <<EOF
 y
 y
 y
 y
 y
 y
EOF
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
chown -R nexus:nexus "$SDK"
systemctl restart nexus-agent
echo "Android SDK prêt. Premier build: télécharge aussi les dépendances Gradle et peut prendre plusieurs minutes."
