/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Bluetooth HC-05
 * =====================================================================
 *  Explication : Pont série entre le moniteur série et un smartphone via le module Bluetooth HC-05.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> HC-05 VCC
 *   Arduino GND    -> HC-05 GND
 *   Arduino D10    -> HC-05 TXD
 *   Arduino D11    -> HC-05 RXD (via pont diviseur)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

#include <SoftwareSerial.h>

// RX Arduino = D10 (vers TXD du HC-05), TX Arduino = D11 (vers RXD du HC-05)
SoftwareSerial bluetooth(10, 11);

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600);   // vitesse par défaut du HC-05
  Serial.println(F("[84] HC-05 pret, appairer avec le code 1234"));
}

void loop() {
  // Bluetooth -> moniteur série
  if (bluetooth.available()) {
    Serial.write(bluetooth.read());
  }
  // Moniteur série -> Bluetooth
  if (Serial.available()) {
    bluetooth.write(Serial.read());
  }
}
