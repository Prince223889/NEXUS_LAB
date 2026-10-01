// ESP32 LAB — Serveur UDP « écho » : renvoie chaque datagramme reçu (test : nc -u IP 4210)
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>

const char *WIFI_SSID = "ESP32-LAB";
const char *WIFI_PASS = "ESP32-LAB-Setup2026!";
const uint16_t PORT = 4210;
WiFiUDP udp;
uint32_t packets = 0;

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  udp.begin(PORT);
  Serial.printf("\n# écho UDP sur %s:%u\n", WiFi.localIP().toString().c_str(), PORT);
}

void loop() {
  int n = udp.parsePacket();
  if (n > 0) {
    uint8_t buf[512];
    int len = udp.read(buf, sizeof(buf));
    udp.beginPacket(udp.remoteIP(), udp.remotePort());
    udp.write(buf, len);
    udp.endPacket();
    packets++;
    Serial.printf("# %d octets de %s:%u (total %lu)\n", len, udp.remoteIP().toString().c_str(), udp.remotePort(), (unsigned long)packets);
  }
}
