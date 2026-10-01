// ESP32 LAB — Minuterie matérielle (API Arduino-ESP32 3.x) : interruption précise toutes les 100 ms
#include <Arduino.h>

hw_timer_t *timer = nullptr;
volatile uint32_t ticks = 0;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

void ARDUINO_ISR_ATTR onTimer() {
  portENTER_CRITICAL_ISR(&mux);
  ticks = ticks + 1;
  portEXIT_CRITICAL_ISR(&mux);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  timer = timerBegin(1000000);                // 1 MHz : 1 tic = 1 µs
  timerAttachInterrupt(timer, &onTimer);
  timerAlarm(timer, 100000, true, 0);         // toutes les 100 000 µs, rechargement automatique
}

void loop() {
  static uint32_t last = 0;
  if (millis() - last >= 1000) {
    last = millis();
    portENTER_CRITICAL(&mux);
    uint32_t t = ticks;
    portEXIT_CRITICAL(&mux);
    Serial.printf("interruptions:%lu\n", (unsigned long)t);   // +10 par seconde
  }
}
