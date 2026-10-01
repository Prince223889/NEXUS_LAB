/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Servomoteur SG90
 * =====================================================================
 *  Explication : Balayage 0-180° d'un servomoteur, piloté par potentiomètre.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Servo fil rouge
 *   Arduino GND    -> Servo fil marron
 *   Arduino D9     -> Servo fil orange (signal)
 *   Arduino A0     -> Pot. curseur
 *   Arduino 5V     -> Pot. extrémité 1
 *   Arduino GND    -> Pot. extrémité 2
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Servo
 * =====================================================================
 */
// @libs: Servo

#include <Servo.h>

const uint8_t PIN_SERVO = 9;
const uint8_t PIN_POT   = A0;
Servo servo;

void setup() {
  servo.attach(PIN_SERVO);
  Serial.begin(9600);
  Serial.println(F("[08] Servo pret"));
}

void loop() {
  int angle = map(analogRead(PIN_POT), 0, 1023, 0, 180);
  servo.write(angle);
  Serial.print(F("Angle: ")); Serial.println(angle);
  delay(20);                             // période servo standard ~20 ms
}
