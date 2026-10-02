/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Horloge RTC DS3231
 * =====================================================================
 *  Explication : Lecture de l'heure d'un module DS3231 via I2C (BCD), sans bibliothèque.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> RTC VCC
 *   Arduino GND    -> RTC GND
 *   Arduino A4     -> RTC SDA
 *   Arduino A5     -> RTC SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

#include <Wire.h>

const uint8_t RTC_ADDR = 0x68;

uint8_t bcd2dec(uint8_t v) { return (v >> 4) * 10 + (v & 0x0F); }

void imprime2(uint8_t v) { if (v < 10) Serial.print('0'); Serial.print(v); }

void setup() {
  Serial.begin(9600);
  Wire.begin();
  Serial.println(F("[18] DS3231 pret"));
}

void loop() {
  Wire.beginTransmission(RTC_ADDR);
  Wire.write(0x00);                      // registre secondes
  if (Wire.endTransmission() != 0) { Serial.println(F("RTC absente")); delay(1000); return; }
  Wire.requestFrom(RTC_ADDR, (uint8_t)7);
  if (Wire.available() < 7) return;
  uint8_t s = bcd2dec(Wire.read() & 0x7F);
  uint8_t m = bcd2dec(Wire.read());
  uint8_t h = bcd2dec(Wire.read() & 0x3F);
  Wire.read();                           // jour de semaine (ignoré)
  uint8_t j = bcd2dec(Wire.read());
  uint8_t mo = bcd2dec(Wire.read() & 0x1F);
  uint8_t a = bcd2dec(Wire.read());
  imprime2(j); Serial.print('/'); imprime2(mo); Serial.print(F("/20")); imprime2(a);
  Serial.print(' ');
  imprime2(h); Serial.print(':'); imprime2(m); Serial.print(':'); imprime2(s);
  Serial.println();
  delay(1000);
}
