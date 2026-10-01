/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  BH1750 Luxmètre
 * =====================================================================
 *  Explication : Mesure l'éclairement lumineux en lux avec un BH1750 en I2C.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> BH1750 VCC
 *   Arduino GND    -> BH1750 GND
 *   Arduino A4     -> BH1750 SDA
 *   Arduino A5     -> BH1750 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : BH1750
 * =====================================================================
 */
// @libs: BH1750

#include <Wire.h>
#include <BH1750.h>

// Objet capteur
BH1750 luxmetre;

void setup() {
  Serial.begin(9600);
  Wire.begin();                         // démarre le bus I2C
  if (!luxmetre.begin()) {
    Serial.println(F("BH1750 introuvable, verifier le cablage"));
    while (true) {}
  }
  Serial.println(F("[28] BH1750 pret"));
}

void loop() {
  float lux = luxmetre.readLightLevel();
  Serial.print(F("Eclairement: ")); Serial.print(lux, 1); Serial.println(F(" lx"));
  delay(500);
}
