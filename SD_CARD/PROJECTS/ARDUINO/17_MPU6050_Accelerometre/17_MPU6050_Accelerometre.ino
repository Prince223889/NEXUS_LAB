/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  MPU-6050 (I2C brut)
 * =====================================================================
 *  Explication : Accéléromètre/gyroscope MPU-6050 lu directement via Wire (aucune bibliothèque externe).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MPU VCC
 *   Arduino GND    -> MPU GND
 *   Arduino A4     -> MPU SDA
 *   Arduino A5     -> MPU SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

#include <Wire.h>

const uint8_t MPU_ADDR = 0x68;           // AD0 à GND

void ecrireRegistre(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg); Wire.write(val);
  Wire.endTransmission();
}

int16_t lire16() {                        // octet haut puis bas
  int16_t h = Wire.read();
  return (h << 8) | Wire.read();
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  ecrireRegistre(0x6B, 0x00);            // PWR_MGMT_1 : sortie du mode veille
  Serial.println(F("[17] MPU-6050 pret"));
}

void loop() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);                      // ACCEL_XOUT_H
  if (Wire.endTransmission(false) != 0) { Serial.println(F("MPU absent")); delay(1000); return; }
  Wire.requestFrom(MPU_ADDR, (uint8_t)14);
  if (Wire.available() < 14) return;
  int16_t ax = lire16(), ay = lire16(), az = lire16();
  int16_t tmp = lire16();
  int16_t gx = lire16(), gy = lire16(), gz = lire16();
  // Échelles par défaut : ±2 g (16384 LSB/g), ±250 °/s (131 LSB/°/s)
  Serial.print(F("A[g] "));  Serial.print(ax / 16384.0, 2); Serial.print(' ');
  Serial.print(ay / 16384.0, 2); Serial.print(' '); Serial.print(az / 16384.0, 2);
  Serial.print(F("  G[dps] ")); Serial.print(gx / 131.0, 1); Serial.print(' ');
  Serial.print(gy / 131.0, 1); Serial.print(' '); Serial.print(gz / 131.0, 1);
  Serial.print(F("  T=")); Serial.println(tmp / 340.0 + 36.53, 1);
  delay(200);
}
