/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Moteur pas à pas 28BYJ-48
 * =====================================================================
 *  Explication : Fait un tour complet dans chaque sens avec un 28BYJ-48 et son driver ULN2003.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> ULN2003 +
 *   Arduino GND    -> ULN2003 -
 *   Arduino D8     -> ULN2003 IN1
 *   Arduino D9     -> ULN2003 IN2
 *   Arduino D10    -> ULN2003 IN3
 *   Arduino D11    -> ULN2003 IN4
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Stepper
 * =====================================================================
 */
// @libs: Stepper

#include <Stepper.h>

// 2048 pas par tour ; ordre IN1, IN3, IN2, IN4 pour le 28BYJ-48
const int PAS_PAR_TOUR = 2048;
Stepper moteur(PAS_PAR_TOUR, 8, 10, 9, 11);

void setup() {
  moteur.setSpeed(10);   // tours par minute (max ~15)
  Serial.begin(9600);
  Serial.println(F("[80] 28BYJ-48 pret"));
}

void loop() {
  Serial.println(F("Un tour sens horaire"));
  moteur.step(PAS_PAR_TOUR);
  delay(1000);
  Serial.println(F("Un tour sens anti-horaire"));
  moteur.step(-PAS_PAR_TOUR);
  delay(1000);
}
