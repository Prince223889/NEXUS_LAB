/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  OLED SSD1306 128x64
 * =====================================================================
 *  Explication : Affiche un texte et un compteur sur un écran OLED I2C 128x64.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> OLED VCC
 *   Arduino GND    -> OLED GND
 *   Arduino A4     -> OLED SDA
 *   Arduino A5     -> OLED SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit SSD1306|Adafruit GFX Library|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Écran 128x64 en I2C, sans broche reset
Adafruit_SSD1306 ecran(128, 64, &Wire, -1);
unsigned long compteur = 0;

void setup() {
  Serial.begin(9600);
  // Adresse I2C habituelle : 0x3C
  if (!ecran.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("Ecran OLED introuvable"));
    while (true);
  }
  Serial.println(F("[76] OLED pret"));
}

void loop() {
  // Efface puis redessine l'écran
  ecran.clearDisplay();
  ecran.setTextColor(SSD1306_WHITE);
  ecran.setTextSize(1);
  ecran.setCursor(0, 0);
  ecran.println(F("Bonjour Arduino !"));
  ecran.setTextSize(2);
  ecran.setCursor(0, 24);
  ecran.print(compteur);
  ecran.display();

  Serial.print(F("Compteur: ")); Serial.println(compteur);
  compteur++;
  delay(1000);
}
