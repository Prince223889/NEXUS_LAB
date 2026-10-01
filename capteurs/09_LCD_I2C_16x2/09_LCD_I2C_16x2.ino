/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  LCD 16x2 I2C
 * =====================================================================
 *  Explication : Affichage sur écran LCD 1602 avec module I2C PCF8574 (adresse 0x27 ou 0x3F).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> LCD VCC
 *   Arduino GND    -> LCD GND
 *   Arduino A4     -> LCD SDA
 *   Arduino A5     -> LCD SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : LiquidCrystal I2C
 * =====================================================================
 */
// @libs: LiquidCrystal I2C

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);      // essayer 0x3F si rien ne s'affiche

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("Arduino Lab");
  lcd.setCursor(0, 1); lcd.print("Nexus v6.1.0");
  delay(2000);
  lcd.clear();
}

void loop() {
  lcd.setCursor(0, 0); lcd.print("Uptime:         ");
  lcd.setCursor(0, 1);
  lcd.print(millis() / 1000UL); lcd.print(" s          ");
  delay(500);
}
