// ESP32 LAB — Interruption sur front + anti-rebond : compter des appuis ou des impulsions
#include <Arduino.h>

const uint8_t BUTTON = 0;                    // bouton BOOT de la carte
volatile uint32_t count = 0;
volatile uint32_t lastUs = 0;

void ARDUINO_ISR_ATTR onFall() {
  uint32_t t = micros();
  if (t - lastUs > 20000) {                  // ignore les rebonds < 20 ms
    count = count + 1;
    lastUs = t;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(BUTTON, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BUTTON), onFall, FALLING);
  Serial.println(F("\n# appuyez sur BOOT"));
}

void loop() {
  static uint32_t shown = 0;
  uint32_t c = count;
  if (c != shown) {
    shown = c;
    Serial.printf("appuis:%lu\n", (unsigned long)c);
  }
  delay(10);
}
