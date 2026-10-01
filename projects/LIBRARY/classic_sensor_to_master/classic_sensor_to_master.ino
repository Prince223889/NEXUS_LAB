// ESP32 LAB — Envoyer ses propres mesures au MASTER (onglet « Capteurs » du dashboard)
// Protocole : datagramme UDP vers 192.168.4.1:4213 au format  LAB|appareil|clé|valeur|unité
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>

const char *WIFI_SSID = "ESP32-LAB";                // point d'accès du MASTER
const char *WIFI_PASS = "ESP32-LAB-Setup2026!";
const char *DEVICE = "atelier";
WiFiUDP udp;

void send(const char *key, float value, const char *unit) {
  udp.beginPacket(IPAddress(192, 168, 4, 1), 4213);
  udp.printf("LAB|%s|%s|%.3f|%s\n", DEVICE, key, value, unit);
  udp.endPacket();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  Serial.printf("\n# connecté au MASTER (%s)\n", WiFi.localIP().toString().c_str());
}

void loop() {
  send("temp_puce", temperatureRead(), "°C");
  send("rssi", WiFi.RSSI(), "dBm");
  send("heap", ESP.getFreeHeap() / 1024.0f, "Ko");
  delay(5000);
}
