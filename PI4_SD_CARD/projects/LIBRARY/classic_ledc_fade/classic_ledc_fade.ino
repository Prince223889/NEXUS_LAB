// ESP32 LAB — Fondu matériel LEDC : la variation se fait sans occuper le processeur
#include <Arduino.h>

const uint8_t LED_PIN = 4;
const uint32_t FREQ = 5000;
const uint8_t RESOLUTION = 10;               // 0-1023

void setup() {
  Serial.begin(115200);
  delay(300);
  ledcAttach(LED_PIN, FREQ, RESOLUTION);
}

void loop() {
  ledcFade(LED_PIN, 0, 1023, 1500);          // montée en 1,5 s (géré par le périphérique LEDC)
  delay(1700);
  ledcFade(LED_PIN, 1023, 0, 1500);
  delay(1700);
}
