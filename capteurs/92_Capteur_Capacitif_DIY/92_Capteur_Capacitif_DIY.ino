/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur capacitif DIY
 * =====================================================================
 *  Explication : Détecte le toucher d'une feuille d'aluminium et allume la LED intégrée.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D4     -> Résistance 1M (côté émission)
 *   Arduino D2     -> Autre côté résistance + feuille alu
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : CapacitiveSensor
 * =====================================================================
 */
// @libs: CapacitiveSensor

#include <CapacitiveSensor.h>

// Émission sur D4, réception sur D2 (reliée à la feuille)
CapacitiveSensor capteur = CapacitiveSensor(4, 2);
const long SEUIL = 1000;   // à ajuster selon la feuille

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[92] Capteur capacitif pret"));
}

void loop() {
  // Mesure avec 30 échantillons
  long valeur = capteur.capacitiveSensor(30);
  bool touche = valeur > SEUIL;
  digitalWrite(LED_BUILTIN, touche ? HIGH : LOW);

  Serial.print(F("Valeur: ")); Serial.print(valeur);
  Serial.println(touche ? F(" -> TOUCHE") : F(""));
  delay(100);
}
