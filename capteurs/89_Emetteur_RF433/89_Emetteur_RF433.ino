/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Émetteur RF 433 MHz
 * =====================================================================
 *  Explication : Envoie un code numérique toutes les secondes avec un émetteur 433 MHz.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Émetteur VCC
 *   Arduino GND    -> Émetteur GND
 *   Arduino D10    -> Émetteur DATA
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : rc-switch
 * =====================================================================
 */
// @libs: rc-switch

#include <RCSwitch.h>

RCSwitch emetteur = RCSwitch();
unsigned long code = 1000;

void setup() {
  Serial.begin(9600);
  emetteur.enableTransmit(10);   // broche DATA
  emetteur.setRepeatTransmit(5); // répétitions pour fiabilité
  Serial.println(F("[89] Emetteur 433 MHz pret"));
}

void loop() {
  // Envoie le code sur 24 bits
  emetteur.send(code, 24);
  Serial.print(F("Code envoye: ")); Serial.println(code);
  code++;
  delay(1000);
}
