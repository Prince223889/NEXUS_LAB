// ESP32 LAB — Protocole série binaire tramé : en-tête, longueur, CRC-16 (robuste aux erreurs)
// Trame : 0xAA 0x55 | type | longueur | données… | CRC16 (Modbus, LSB d'abord)
#include <Arduino.h>

uint16_t crc16(const uint8_t *d, size_t n) {
  uint16_t c = 0xFFFF;
  for (size_t i = 0; i < n; i++) {
    c ^= d[i];
    for (int k = 0; k < 8; k++) c = (c & 1) ? (c >> 1) ^ 0xA001 : c >> 1;
  }
  return c;
}

void sendFrame(uint8_t type, const uint8_t *payload, uint8_t len) {
  uint8_t buf[260];
  buf[0] = 0xAA; buf[1] = 0x55; buf[2] = type; buf[3] = len;
  memcpy(buf + 4, payload, len);
  uint16_t c = crc16(buf + 2, len + 2);
  buf[4 + len] = c & 0xFF;
  buf[5 + len] = c >> 8;
  Serial.write(buf, len + 6);
}

void setup() {
  Serial.begin(115200);
  delay(300);
}

void loop() {
  struct __attribute__((packed)) {
    uint32_t uptime;
    uint32_t heap;
    float temp;
  } sample = {millis(), ESP.getFreeHeap(), temperatureRead()};
  sendFrame(0x01, (const uint8_t *)&sample, sizeof(sample));
  delay(1000);
}
