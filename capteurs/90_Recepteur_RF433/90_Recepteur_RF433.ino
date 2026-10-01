/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Récepteur RF 433 MHz
 * =====================================================================
 *  Explication : Reçoit et affiche les codes 433 MHz (télécommandes ou sketch émetteur).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Récepteur VCC
 *   Arduino GND    -> Récepteur GND
 *   Arduino D2     -> Récepteur DATA
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : rc-switch
 * =====================================================================
 */
// @libs: rc-switch

#include <RCSwitch.h>

RCSwitch recepteur = RCSwitch();

void setup() {
  Serial.begin(9600);
  recepteur.enableReceive(0);   // interruption 0 = broche D2
  Serial.println(F("[90] Recepteur 433 MHz pret"));
}

void loop() {
  // Un code a-t-il été reçu ?
  if (recepteur.available()) {
    Serial.print(F("Code recu: "));
    Serial.print(recepteur.getReceivedValue());
    Serial.print(F(" / "));
    Serial.print(recepteur.getReceivedBitlength());
    Serial.println(F(" bits"));
    recepteur.resetAvailable();
  }
}
