/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Afficheur 4 digits TM1637
 * =====================================================================
 *  Explication : Affiche un compteur sur un afficheur 4 chiffres TM1637.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> TM1637 VCC
 *   Arduino GND    -> TM1637 GND
 *   Arduino D2     -> TM1637 CLK
 *   Arduino D3     -> TM1637 DIO
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : TM1637
 * =====================================================================
 */
// @libs: TM1637

#include <TM1637Display.h>

// Broches du module
const uint8_t PIN_CLK = 2;
const uint8_t PIN_DIO = 3;

TM1637Display afficheur(PIN_CLK, PIN_DIO);
int compteur = 0;

void setup() {
  Serial.begin(9600);
  afficheur.setBrightness(5);   // luminosité 0 à 7
  afficheur.clear();
  Serial.println(F("[74] TM1637 pret"));
}

void loop() {
  // Affiche le compteur puis l'incrémente
  afficheur.showNumberDec(compteur, false);
  Serial.print(F("Compteur: ")); Serial.println(compteur);
  compteur++;
  if (compteur > 9999) compteur = 0;
  delay(500);
}
