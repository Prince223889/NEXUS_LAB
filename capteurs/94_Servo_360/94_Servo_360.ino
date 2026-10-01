/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Servo rotation continue
 * =====================================================================
 *  Explication : Commande la vitesse et le sens d'un servo à rotation continue 360°.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Servo VCC (rouge)
 *   Arduino GND    -> Servo GND (marron)
 *   Arduino D9     -> Servo signal (orange)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Servo
 * =====================================================================
 */
// @libs: Servo

#include <Servo.h>

Servo servo;
// 90 = arrêt, 0 = pleine vitesse un sens, 180 = pleine vitesse autre sens
const int ARRET = 90;

void setup() {
  servo.attach(9);
  servo.write(ARRET);
  Serial.begin(9600);
  Serial.println(F("[94] Servo 360 pret"));
}

void loop() {
  Serial.println(F("Sens horaire rapide"));
  servo.write(0);    delay(2000);
  Serial.println(F("Arret"));
  servo.write(ARRET); delay(1000);
  Serial.println(F("Sens anti-horaire lent"));
  servo.write(120);  delay(2000);
  Serial.println(F("Arret"));
  servo.write(ARRET); delay(1000);
}
