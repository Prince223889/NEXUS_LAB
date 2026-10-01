// ESP32 LAB — Échanges JSON sur le port série (ArduinoJson 7) : idéal pour piloter la carte depuis Python
// Envoyez par exemple : {"cmd":"set","led":true,"period":500}
#include <Arduino.h>
#include <ArduinoJson.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

uint32_t period = 2000;
bool led = false;

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  if (Serial.available()) {
    JsonDocument in;
    DeserializationError err = deserializeJson(in, Serial);
    JsonDocument out;
    if (err) {
      out["ok"] = false;
      out["error"] = err.c_str();
    } else if (in["cmd"] == "set") {
      if (in["led"].is<bool>()) { led = in["led"]; digitalWrite(LED_BUILTIN, led); }
      if (in["period"].is<uint32_t>()) period = constrain(in["period"].as<uint32_t>(), 100u, 60000u);
      out["ok"] = true;
    } else {
      out["ok"] = false;
      out["error"] = "commande inconnue";
    }
    serializeJson(out, Serial);
    Serial.println();
    while (Serial.available()) Serial.read();
  }
  static uint32_t last = 0;
  if (millis() - last >= period) {
    last = millis();
    JsonDocument doc;
    doc["uptime_ms"] = millis();
    doc["heap"] = ESP.getFreeHeap();
    doc["temp_c"] = temperatureRead();
    doc["led"] = led;
    serializeJson(doc, Serial);
    Serial.println();
  }
}
