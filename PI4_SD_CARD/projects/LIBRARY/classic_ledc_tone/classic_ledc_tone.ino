// ESP32 LAB — Mélodie sur buzzer passif (Frère Jacques) avec tone()
#include <Arduino.h>

const uint8_t BUZZER = 25;
const uint16_t DO = 262, RE = 294, MI = 330, FA = 349, SOL = 392, LA = 440;
const uint16_t notes[] = {DO, RE, MI, DO, DO, RE, MI, DO, MI, FA, SOL, MI, FA, SOL};
const uint16_t durees[] = {400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 800, 400, 400, 800};

void setup() {
  Serial.begin(115200);
  delay(300);
}

void loop() {
  for (size_t i = 0; i < sizeof(notes) / sizeof(notes[0]); i++) {
    tone(BUZZER, notes[i], durees[i] * 9 / 10);
    delay(durees[i]);
  }
  noTone(BUZZER);
  delay(2000);
}
