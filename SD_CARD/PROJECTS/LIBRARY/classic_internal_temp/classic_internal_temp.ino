// ESP32 LAB — Capteur de température interne de la puce (indicatif : surveille l'échauffement)
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(300);
}

void loop() {
  Serial.printf("temp_puce:%.1f\n", temperatureRead());
  delay(1000);
}
