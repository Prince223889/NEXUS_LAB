/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  ADXL345 accéléromètre
 * =====================================================================
 *  Explication : Lit l'accélération sur 3 axes en I2C sans bibliothèque.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> ADXL345 VCC
 *   Arduino GND    -> ADXL345 GND
 *   Arduino A4     -> ADXL345 SDA
 *   Arduino A5     -> ADXL345 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

#include <Wire.h>

const uint8_t ADXL345 = 0x53;   // adresse I2C (SDO à GND)

// Écrit une valeur dans un registre
void ecrireRegistre(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(ADXL345);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  ecrireRegistre(0x31, 0x08);   // DATA_FORMAT : pleine résolution, ±2 g
  ecrireRegistre(0x2D, 0x08);   // POWER_CTL : mode mesure
  Serial.println(F("[61] ADXL345 pret"));
}

void loop() {
  // Lecture des 6 octets à partir de DATAX0
  Wire.beginTransmission(ADXL345);
  Wire.write(0x32);
  Wire.endTransmission(false);
  Wire.requestFrom(ADXL345, (uint8_t)6);
  int16_t x = Wire.read() | (Wire.read() << 8);
  int16_t y = Wire.read() | (Wire.read() << 8);
  int16_t z = Wire.read() | (Wire.read() << 8);

  // 3,9 mg par bit en pleine résolution
  Serial.print(F("X=")); Serial.print(x * 0.0039, 2);
  Serial.print(F(" g  Y=")); Serial.print(y * 0.0039, 2);
  Serial.print(F(" g  Z=")); Serial.print(z * 0.0039, 2);
  Serial.println(F(" g"));
  delay(200);
}
