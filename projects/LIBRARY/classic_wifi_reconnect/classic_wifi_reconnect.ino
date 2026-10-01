// ESP32 LAB — Connexion Wi-Fi robuste : événements, reconnexion automatique avec recul progressif
#include <Arduino.h>
#include <WiFi.h>

const char *WIFI_SSID = "VotreBox";          // à adapter
const char *WIFI_PASS = "VotreMotDePasse";

uint32_t retryDelay = 2000;
uint32_t nextRetry = 0;
uint32_t disconnects = 0;

void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.printf("# connecté : IP %s, RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
      retryDelay = 2000;
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      disconnects++;
      Serial.printf("# déconnecté (raison %u), nouvelle tentative dans %lu ms\n", info.wifi_sta_disconnected.reason, (unsigned long)retryDelay);
      nextRetry = millis() + retryDelay;
      if (retryDelay < 60000) retryDelay *= 2;   // recul exponentiel : ménage la box et la radio
      break;
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.onEvent(onWifiEvent);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);               // la reconnexion est gérée ici
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED && nextRetry && (int32_t)(millis() - nextRetry) >= 0) {
    nextRetry = 0;
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  }
  static uint32_t last = 0;
  if (millis() - last > 5000) {
    last = millis();
    Serial.printf("wifi:%d\trssi:%d\tdeconnexions:%lu\n", WiFi.status() == WL_CONNECTED, WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -100, (unsigned long)disconnects);
  }
}
