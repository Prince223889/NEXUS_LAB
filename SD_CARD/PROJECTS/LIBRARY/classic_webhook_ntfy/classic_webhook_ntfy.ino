// ESP32 LAB — Notification sur téléphone via ntfy.sh (application gratuite, sans compte)
// Installez l'app ntfy, abonnez-vous au même sujet (TOPIC) et appuyez sur le bouton BOOT.
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>

const char *WIFI_SSID = "VotreBox";
const char *WIFI_PASS = "VotreMotDePasse";
const char *TOPIC = "esp32-lab-changez-ce-nom";   // choisissez un nom long et unique
const uint8_t BUTTON = 0;

bool notify(const String &text) {
  NetworkClientSecure client;
  client.setInsecure();                       // démonstration ; utilisez setCACert en production
  HTTPClient http;
  if (!http.begin(client, String("https://ntfy.sh/") + TOPIC)) return false;
  http.addHeader("Title", "ESP32 LAB");
  http.addHeader("Tags", "bell");
  int code = http.POST(text);
  http.end();
  return code == 200;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(BUTTON, INPUT_PULLUP);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  Serial.println(F("\n# prêt : appuyez sur BOOT"));
}

void loop() {
  if (digitalRead(BUTTON) == LOW) {
    bool ok = notify(String("Bouton appuyé ! Température puce : ") + String(temperatureRead(), 1) + " °C");
    Serial.println(ok ? F("# notification envoyée") : F("# échec d'envoi"));
    delay(1000);
  }
}
