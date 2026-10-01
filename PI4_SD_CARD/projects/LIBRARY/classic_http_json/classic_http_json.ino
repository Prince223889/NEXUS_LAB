// ESP32 LAB — Client HTTPS + JSON : météo actuelle via l'API ouverte Open-Meteo (sans clé)
// Bibliothèque : ArduinoJson 7
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <ArduinoJson.h>

const char *WIFI_SSID = "VotreBox";
const char *WIFI_PASS = "VotreMotDePasse";
const float LATITUDE = 48.85, LONGITUDE = 2.35;   // Paris

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  Serial.println(F("\n# Wi-Fi connecté"));
}

void loop() {
  NetworkClientSecure client;
  client.setInsecure();            // démonstration ; en production, chargez le certificat racine (setCACert)
  HTTPClient http;
  String url = String("https://api.open-meteo.com/v1/forecast?latitude=") + LATITUDE + "&longitude=" + LONGITUDE +
               "&current=temperature_2m,relative_humidity_2m,wind_speed_10m";
  if (http.begin(client, url)) {
    int code = http.GET();
    if (code == HTTP_CODE_OK) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, http.getStream());
      if (!err) {
        float t = doc["current"]["temperature_2m"];
        float h = doc["current"]["relative_humidity_2m"];
        float w = doc["current"]["wind_speed_10m"];
        Serial.printf("meteo_temp:%.1f\tmeteo_hum:%.0f\tmeteo_vent:%.1f\n", t, h, w);
      } else {
        Serial.printf("# JSON invalide : %s\n", err.c_str());
      }
    } else {
      Serial.printf("# HTTP %d\n", code);
    }
    http.end();
  }
  delay(60000);
}
