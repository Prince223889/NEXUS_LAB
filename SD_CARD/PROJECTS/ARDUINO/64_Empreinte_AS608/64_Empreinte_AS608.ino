/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Lecteur d'empreinte AS608/R307
 * =====================================================================
 *  Explication : Reconnaît une empreinte digitale déjà enregistrée dans le capteur.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Capteur VCC
 *   Arduino GND    -> Capteur GND
 *   Arduino D2     -> Capteur TX
 *   Arduino D3     -> Capteur RX
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit Fingerprint Sensor Library
 * =====================================================================
 */
// @libs: Adafruit Fingerprint Sensor Library

#include <SoftwareSerial.h>
#include <Adafruit_Fingerprint.h>

// RX Arduino = D2 (TX capteur), TX Arduino = D3 (RX capteur)
SoftwareSerial capteurSerial(2, 3);
Adafruit_Fingerprint doigt = Adafruit_Fingerprint(&capteurSerial);

void setup() {
  Serial.begin(9600);
  doigt.begin(57600);   // vitesse par défaut du capteur
  if (!doigt.verifyPassword()) {
    Serial.println(F("Capteur d'empreinte introuvable"));
    while (1) {}
  }
  Serial.println(F("[64] Capteur d'empreinte pret, posez un doigt"));
}

void loop() {
  // 1) Prise de l'image
  if (doigt.getImage() != FINGERPRINT_OK) return;
  // 2) Conversion en modèle
  if (doigt.image2Tz() != FINGERPRINT_OK) return;
  // 3) Recherche dans la base
  if (doigt.fingerFastSearch() == FINGERPRINT_OK) {
    Serial.print(F("Empreinte reconnue, ID #"));
    Serial.print(doigt.fingerID);
    Serial.print(F("  confiance "));
    Serial.println(doigt.confidence);
  } else {
    Serial.println(F("Empreinte inconnue"));
  }
  delay(1000);
}
