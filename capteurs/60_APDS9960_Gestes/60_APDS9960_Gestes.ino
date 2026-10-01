/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  APDS9960 gestes
 * =====================================================================
 *  Explication : Détecte les gestes de la main (haut, bas, gauche, droite).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> APDS9960 VCC
 *   Arduino GND    -> APDS9960 GND
 *   Arduino A4     -> APDS9960 SDA
 *   Arduino A5     -> APDS9960 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit APDS9960 Library, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit APDS9960 Library|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_APDS9960.h>

Adafruit_APDS9960 apds;

void setup() {
  Serial.begin(9600);
  if (!apds.begin()) {
    Serial.println(F("APDS9960 introuvable"));
    while (1) {}
  }
  // La détection de gestes nécessite la proximité
  apds.enableProximity(true);
  apds.enableGesture(true);
  Serial.println(F("[60] APDS9960 pret, passez la main"));
}

void loop() {
  uint8_t geste = apds.readGesture();
  if (geste == APDS9960_UP)    Serial.println(F("Haut"));
  if (geste == APDS9960_DOWN)  Serial.println(F("Bas"));
  if (geste == APDS9960_LEFT)  Serial.println(F("Gauche"));
  if (geste == APDS9960_RIGHT) Serial.println(F("Droite"));
}
