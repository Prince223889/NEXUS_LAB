/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Pince ampèremétrique SCT-013
 * =====================================================================
 *  Explication : Mesure le courant alternatif efficace avec une pince SCT-013 et EmonLib.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Pont diviseur 10k/10k (haut)
 *   Arduino GND    -> Pont diviseur 10k/10k (bas) + condensateur
 *   Arduino A1     -> Pince + milieu du pont (via résistance 33 ohms)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : EmonLib
 * =====================================================================
 */
// @libs: EmonLib

#include <EmonLib.h>

EnergyMonitor emon;
const float TENSION_SECTEUR = 230.0;   // tension estimée (V)

void setup() {
  Serial.begin(9600);
  // Entrée A1, calibration = 2000 spires / 33 ohms ≈ 60.6
  emon.current(A1, 60.6);
  Serial.println(F("[98] SCT-013 pret"));
}

void loop() {
  // Courant efficace sur 1480 échantillons
  double courant = emon.calcIrms(1480);
  Serial.print(F("Courant: ")); Serial.print(courant, 2);
  Serial.print(F(" A  Puissance approx: "));
  Serial.print(courant * TENSION_SECTEUR, 0);
  Serial.println(F(" W"));
  delay(1000);
}
