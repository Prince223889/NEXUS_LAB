// ESP32 LAB — Nom réseau mDNS : joignez la carte par http://esp32-demo.local/ au lieu de son IP
#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>

const char *WIFI_SSID = "ESP32-LAB";
const char *WIFI_PASS = "ESP32-LAB-Setup2026!";
const char *HOSTNAME = "esp32-demo";
WebServer server(80);

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.setHostname(HOSTNAME);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  if (MDNS.begin(HOSTNAME)) {
    MDNS.addService("http", "tcp", 80);
    Serial.printf("\n# http://%s.local/  (IP %s)\n", HOSTNAME, WiFi.localIP().toString().c_str());
  }
  server.on("/", []() { server.send(200, "text/plain; charset=utf-8", "Bonjour depuis esp32-demo.local !"); });
  server.begin();
}

void loop() {
  server.handleClient();
}
