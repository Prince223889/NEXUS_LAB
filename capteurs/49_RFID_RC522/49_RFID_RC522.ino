/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  RFID RC522
 * =====================================================================
 *  Explication : Lit l'identifiant (UID) des badges RFID 13,56 MHz.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> RC522 3.3V
 *   Arduino GND    -> RC522 GND
 *   Arduino D9     -> RC522 RST
 *   Arduino D10    -> RC522 SDA(SS)
 *   Arduino D11    -> RC522 MOSI
 *   Arduino D12    -> RC522 MISO
 *   Arduino D13    -> RC522 SCK
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : MFRC522
 * =====================================================================
 */
// @libs: MFRC522

#include <SPI.h>
#include <MFRC522.h>

const uint8_t PIN_SS  = 10;
const uint8_t PIN_RST = 9;

MFRC522 rfid(PIN_SS, PIN_RST);

void setup() {
  Serial.begin(9600);
  SPI.begin();          // bus SPI
  rfid.PCD_Init();      // initialisation du lecteur
  Serial.println(F("[49] RFID RC522 pret, approchez un badge"));
}

void loop() {
  // Attente d'un nouveau badge
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Affichage de l'UID en hexadécimal
  Serial.print(F("UID:"));
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? F(" 0") : F(" "));
    Serial.print(rfid.uid.uidByte[i], HEX);
  }
  Serial.println();

  rfid.PICC_HaltA();    // fin de la communication avec le badge
}
