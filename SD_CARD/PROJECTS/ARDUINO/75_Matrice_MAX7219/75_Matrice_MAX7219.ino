/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Matrice LED 8x8 MAX7219
 * =====================================================================
 *  Explication : Affiche un smiley puis un cœur sur une matrice 8x8 pilotée par MAX7219.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MAX7219 VCC
 *   Arduino GND    -> MAX7219 GND
 *   Arduino D12    -> MAX7219 DIN
 *   Arduino D11    -> MAX7219 CLK
 *   Arduino D10    -> MAX7219 CS
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : LedControl
 * =====================================================================
 */
// @libs: LedControl

#include <LedControl.h>

// DIN, CLK, CS, nombre de modules
LedControl matrice(12, 11, 10, 1);

// Motifs 8x8 (une ligne par octet)
const byte SMILEY[8] = {B00111100, B01000010, B10100101, B10000001, B10100101, B10011001, B01000010, B00111100};
const byte COEUR[8]  = {B00000000, B01100110, B11111111, B11111111, B11111111, B01111110, B00111100, B00011000};

// Affiche un motif ligne par ligne
void afficherMotif(const byte motif[8]) {
  for (int ligne = 0; ligne < 8; ligne++) matrice.setRow(0, ligne, motif[ligne]);
}

void setup() {
  Serial.begin(9600);
  matrice.shutdown(0, false);   // sortie du mode veille
  matrice.setIntensity(0, 8);   // luminosité 0 à 15
  matrice.clearDisplay(0);
  Serial.println(F("[75] Matrice MAX7219 prete"));
}

void loop() {
  afficherMotif(SMILEY);
  Serial.println(F("Smiley"));
  delay(1000);
  afficherMotif(COEUR);
  Serial.println(F("Coeur"));
  delay(1000);
}
