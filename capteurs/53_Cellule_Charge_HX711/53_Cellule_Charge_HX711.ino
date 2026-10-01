/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Cellule de charge HX711
 * =====================================================================
 *  Explication : Pèse un objet avec une cellule de charge et l'amplificateur HX711.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> HX711 VCC
 *   Arduino GND    -> HX711 GND
 *   Arduino D3     -> HX711 DT
 *   Arduino D2     -> HX711 SCK
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : HX711 Arduino Library
 * =====================================================================
 */
// @libs: HX711 Arduino Library

#include "HX711.h"

const uint8_t PIN_DT  = 3;
const uint8_t PIN_SCK = 2;

// Facteur d'étalonnage à ajuster avec une masse connue
const float FACTEUR = 420.0;

HX711 balance;

void setup() {
  Serial.begin(9600);
  balance.begin(PIN_DT, PIN_SCK);
  balance.set_scale(FACTEUR);
  Serial.println(F("[53] HX711 : tare, ne rien poser..."));
  balance.tare();      // mise à zéro
  Serial.println(F("Pret"));
}

void loop() {
  if (balance.is_ready()) {
    // Moyenne de 10 mesures
    float masse = balance.get_units(10);
    Serial.print(F("Masse: "));
    Serial.print(masse, 1);
    Serial.println(F(" g"));
  } else {
    Serial.println(F("HX711 non detecte"));
  }
  delay(500);
}
