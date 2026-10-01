// ESP32 LAB — Identifiants uniques : UUID v4 (générateur matériel) et identifiant de puce
#include <Arduino.h>
#include <esp_random.h>

String uuid4() {
  uint8_t b[16];
  esp_fill_random(b, sizeof(b));             // vrai aléa quand le Wi-Fi/BT est actif
  b[6] = (b[6] & 0x0F) | 0x40;               // version 4
  b[8] = (b[8] & 0x3F) | 0x80;               // variante RFC 4122
  char s[37];
  snprintf(s, sizeof(s), "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
           b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15]);
  return String(s);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n# identifiant de puce : %012llX\n", ESP.getEfuseMac());
}

void loop() {
  Serial.printf("# %s\n", uuid4().c_str());
  delay(2000);
}
