// ESP32 LAB — Client MQTT : publie des mesures et reçoit des commandes (Mosquitto, Home Assistant)
// Bibliothèque : PubSubClient. Sujets : lab/esp32/temp (publié) et lab/esp32/led (commande on/off)
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

const char *WIFI_SSID = "VotreBox";
const char *WIFI_PASS = "VotreMotDePasse";
const char *MQTT_HOST = "192.168.1.10";      // adresse du broker
WiFiClient net;
PubSubClient mqtt(net);

void onMessage(char *topic, byte *payload, unsigned int len) {
  String msg;
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];
  Serial.printf("# %s = %s\n", topic, msg.c_str());
  if (String(topic) == "lab/esp32/led") digitalWrite(LED_BUILTIN, msg == "on");
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  mqtt.setServer(MQTT_HOST, 1883);
  mqtt.setCallback(onMessage);
}

void loop() {
  if (!mqtt.connected()) {
    static uint32_t retry = 0;
    if (millis() - retry > 5000) {
      retry = millis();
      if (mqtt.connect("esp32-lab")) { mqtt.subscribe("lab/esp32/led"); Serial.println(F("# MQTT connecté")); }
    }
  }
  mqtt.loop();
  static uint32_t last = 0;
  if (mqtt.connected() && millis() - last > 10000) {
    last = millis();
    char v[16];
    snprintf(v, sizeof(v), "%.1f", temperatureRead());
    mqtt.publish("lab/esp32/temp", v);
  }
}
