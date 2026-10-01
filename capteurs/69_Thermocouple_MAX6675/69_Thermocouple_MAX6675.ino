/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Thermocouple MAX6675
 * =====================================================================
 *  Explication : Mesure des températures élevées (jusqu'à 1024 °C) avec un thermocouple type K.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MAX6675 VCC
 *   Arduino GND    -> MAX6675 GND
 *   Arduino D6     -> MAX6675 SCK
 *   Arduino D5     -> MAX6675 CS
 *   Arduino D4     -> MAX6675 SO
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : MAX6675 library
 * =====================================================================
 */
// @libs: MAX6675 library

#include "max6675.h"

const int PIN_SCK = 6;
const int PIN_CS  = 5;
const int PIN_SO  = 4;

MAX6675 thermocouple(PIN_SCK, PIN_CS, PIN_SO);

void setup() {
  Serial.begin(9600);
  Serial.println(F("[69] MAX6675 pret"));
  delay(500);   // stabilisation du circuit
}

void loop() {
  float t = thermocouple.readCelsius();
  if (isnan(t)) {
    Serial.println(F("Thermocouple deconnecte"));
  } else {
    Serial.print(F("Temperature: "));
    Serial.print(t, 2);
    Serial.println(F(" C"));
  }
  delay(1000);   // le MAX6675 a besoin d'au moins 250 ms entre deux lectures
}
