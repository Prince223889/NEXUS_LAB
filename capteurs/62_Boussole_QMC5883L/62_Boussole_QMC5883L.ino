/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Boussole QMC5883L
 * =====================================================================
 *  Explication : Calcule le cap magnétique en degrés avec le magnétomètre QMC5883L (I2C brut).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> QMC5883L VCC
 *   Arduino GND    -> QMC5883L GND
 *   Arduino A4     -> QMC5883L SDA
 *   Arduino A5     -> QMC5883L SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

#include <Wire.h>

const uint8_t QMC = 0x0D;   // adresse I2C du QMC5883L

// Écrit une valeur dans un registre
void ecrireRegistre(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(QMC);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  ecrireRegistre(0x0B, 0x01);   // période SET/RESET
  ecrireRegistre(0x09, 0x1D);   // mode continu, 200 Hz, 8 G, OSR 512
  Serial.println(F("[62] QMC5883L pret"));
}

void loop() {
  // Lecture X, Y, Z (octet faible puis fort)
  Wire.beginTransmission(QMC);
  Wire.write(0x00);
  Wire.endTransmission(false);
  Wire.requestFrom(QMC, (uint8_t)6);
  int16_t x = Wire.read() | (Wire.read() << 8);
  int16_t y = Wire.read() | (Wire.read() << 8);
  int16_t z = Wire.read() | (Wire.read() << 8);

  // Cap en degrés (module à plat)
  float cap = atan2((float)y, (float)x) * 180.0 / PI;
  if (cap < 0) cap += 360.0;

  Serial.print(F("X=")); Serial.print(x);
  Serial.print(F(" Y=")); Serial.print(y);
  Serial.print(F(" Z=")); Serial.print(z);
  Serial.print(F("  Cap: ")); Serial.print(cap, 0);
  Serial.println(F(" deg"));
  delay(300);
}
