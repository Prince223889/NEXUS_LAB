/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  VL53L0X laser ToF
 * =====================================================================
 *  Explication : Mesure une distance jusqu'à 2 m par temps de vol laser.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> VL53L0X VIN
 *   Arduino GND    -> VL53L0X GND
 *   Arduino A4     -> VL53L0X SDA
 *   Arduino A5     -> VL53L0X SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : VL53L0X
 * =====================================================================
 */
// @libs: VL53L0X

#include <Wire.h>
#include <VL53L0X.h>

VL53L0X capteur;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  capteur.setTimeout(500);
  if (!capteur.init()) {
    Serial.println(F("VL53L0X introuvable"));
    while (1) {}
  }
  capteur.startContinuous();   // mesures en continu
  Serial.println(F("[58] VL53L0X pret"));
}

void loop() {
  uint16_t mm = capteur.readRangeContinuousMillimeters();
  if (capteur.timeoutOccurred() || mm > 2000) {
    Serial.println(F("Hors de portee"));
  } else {
    Serial.print(F("Distance: "));
    Serial.print(mm);
    Serial.println(F(" mm"));
  }
  delay(100);
}
