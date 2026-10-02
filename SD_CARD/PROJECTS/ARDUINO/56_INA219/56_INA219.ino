/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  INA219 courant/tension
 * =====================================================================
 *  Explication : Mesure tension, courant et puissance d'une charge via I2C.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> INA219 VCC
 *   Arduino GND    -> INA219 GND
 *   Arduino A4     -> INA219 SDA
 *   Arduino A5     -> INA219 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit INA219, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit INA219|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_INA219.h>

Adafruit_INA219 ina219;   // adresse par défaut 0x40

void setup() {
  Serial.begin(9600);
  if (!ina219.begin()) {
    Serial.println(F("INA219 introuvable"));
    while (1) {}
  }
  Serial.println(F("[56] INA219 pret"));
}

void loop() {
  // Lecture des grandeurs
  float tension   = ina219.getBusVoltage_V();
  float courant   = ina219.getCurrent_mA();
  float puissance = ina219.getPower_mW();

  Serial.print(F("U=")); Serial.print(tension, 2); Serial.print(F(" V  "));
  Serial.print(F("I=")); Serial.print(courant, 1); Serial.print(F(" mA  "));
  Serial.print(F("P=")); Serial.print(puissance, 1); Serial.println(F(" mW"));
  delay(1000);
}
