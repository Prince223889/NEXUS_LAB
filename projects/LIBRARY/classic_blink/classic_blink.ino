// ESP32 LAB — Clignotement de la LED intégrée (le « Hello world » du matériel)
// Carte : n'importe quel ESP32. LED_BUILTIN vaut GPIO2 sur la plupart des DevKit.
#include <Arduino.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

const uint32_t PERIODE_MS = 500;

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.printf("\n# Clignotement sur GPIO%d\n", LED_BUILTIN);
}

void loop() {
  static uint32_t last = 0;
  static bool on = false;
  if (millis() - last >= PERIODE_MS) {        // non bloquant : pas de delay()
    last = millis();
    on = !on;
    digitalWrite(LED_BUILTIN, on ? HIGH : LOW);
    Serial.printf("led:%d\n", on ? 1 : 0);
  }
}
