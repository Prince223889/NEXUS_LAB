// ESP32 LAB — Mise à jour sans fil depuis l'IDE Arduino (ArduinoOTA)
// Après un premier téléversement par USB, la carte apparaît dans Outils > Port (port réseau).
#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>

const char *WIFI_SSID = "ESP32-LAB";
const char *WIFI_PASS = "ESP32-LAB-Setup2026!";
const char *OTA_NAME = "esp32-atelier";
const char *OTA_PASSWORD = "CHANGE_ME_OTA_PASSWORD";   // demandé par l'IDE à chaque envoi

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  ArduinoOTA.setHostname(OTA_NAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);
  ArduinoOTA.onStart([]() { Serial.println(F("\n# OTA : début")); });
  ArduinoOTA.onProgress([](unsigned int done, unsigned int total) { Serial.printf("# OTA %u %%\r", done * 100 / total); });
  ArduinoOTA.onEnd([]() { Serial.println(F("\n# OTA : terminé, redémarrage")); });
  ArduinoOTA.onError([](ota_error_t e) { Serial.printf("\n# OTA : erreur %u\n", e); });
  ArduinoOTA.begin();
  Serial.printf("\n# prêt pour l'OTA : %s.local (%s)\n", OTA_NAME, WiFi.localIP().toString().c_str());
}

void loop() {
  ArduinoOTA.handle();
}
