/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Clavier matriciel 4x4
 * =====================================================================
 *  Explication : Affiche sur le moniteur série la touche appuyée sur un clavier 4x4.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D9     -> Clavier L1
 *   Arduino D8     -> Clavier L2
 *   Arduino D7     -> Clavier L3
 *   Arduino D6     -> Clavier L4
 *   Arduino D5     -> Clavier C1
 *   Arduino D4     -> Clavier C2
 *   Arduino D3     -> Clavier C3
 *   Arduino D2     -> Clavier C4
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Keypad
 * =====================================================================
 */
// @libs: Keypad

#include <Keypad.h>

// Dimensions du clavier
const byte LIGNES = 4;
const byte COLONNES = 4;

// Disposition des touches
char touches[LIGNES][COLONNES] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

// Broches reliées aux lignes et aux colonnes
byte brochesLignes[LIGNES] = {9, 8, 7, 6};
byte brochesColonnes[COLONNES] = {5, 4, 3, 2};

Keypad clavier = Keypad(makeKeymap(touches), brochesLignes, brochesColonnes, LIGNES, COLONNES);

void setup() {
  Serial.begin(9600);
  Serial.println(F("[47] Clavier 4x4 pret"));
}

void loop() {
  // Lecture non bloquante d'une touche
  char touche = clavier.getKey();
  if (touche) {
    Serial.print(F("Touche: "));
    Serial.println(touche);
  }
}
