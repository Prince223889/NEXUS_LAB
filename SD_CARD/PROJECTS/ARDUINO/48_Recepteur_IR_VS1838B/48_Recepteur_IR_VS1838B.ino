/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Récepteur IR VS1838B
 * =====================================================================
 *  Explication : Décode les codes d'une télécommande infrarouge et les affiche.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> VS1838B VCC
 *   Arduino GND    -> VS1838B GND
 *   Arduino D2     -> VS1838B OUT
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : IRremote
 * =====================================================================
 */
// @libs: IRremote

#include <IRremote.hpp>

const uint8_t PIN_IR = 2;

void setup() {
  Serial.begin(9600);
  // Démarrage du récepteur (LED 13 clignote à chaque réception)
  IrReceiver.begin(PIN_IR, ENABLE_LED_FEEDBACK);
  Serial.println(F("[48] Recepteur IR pret"));
}

void loop() {
  // Un code a-t-il été reçu ?
  if (IrReceiver.decode()) {
    Serial.print(F("Commande: 0x"));
    Serial.println(IrReceiver.decodedIRData.command, HEX);
    IrReceiver.resume();   // prêt pour le code suivant
  }
}
