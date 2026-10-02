/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  nRF24L01 émetteur
 * =====================================================================
 *  Explication : Envoie un compteur sans fil à 2,4 GHz avec un module nRF24L01.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> nRF24 VCC
 *   Arduino GND    -> nRF24 GND
 *   Arduino D9     -> nRF24 CE
 *   Arduino D10    -> nRF24 CSN
 *   Arduino D11    -> nRF24 MOSI
 *   Arduino D12    -> nRF24 MISO
 *   Arduino D13    -> nRF24 SCK
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : RF24
 * =====================================================================
 */
// @libs: RF24

#include <SPI.h>
#include <RF24.h>

// CE = D9, CSN = D10
RF24 radio(9, 10);
const byte ADRESSE[6] = "00001";   // identique sur le récepteur
unsigned long compteur = 0;

void setup() {
  Serial.begin(9600);
  if (!radio.begin()) {
    Serial.println(F("nRF24L01 introuvable"));
    while (true);
  }
  radio.setPALevel(RF24_PA_LOW);     // faible puissance (tests)
  radio.openWritingPipe(ADRESSE);
  radio.stopListening();             // mode émetteur
  Serial.println(F("[91] nRF24L01 emetteur pret"));
}

void loop() {
  // Envoi du compteur et vérification de l'accusé de réception
  bool ok = radio.write(&compteur, sizeof(compteur));
  Serial.print(F("Envoi ")); Serial.print(compteur);
  Serial.println(ok ? F(" : OK") : F(" : echec"));
  compteur++;
  delay(1000);
}
