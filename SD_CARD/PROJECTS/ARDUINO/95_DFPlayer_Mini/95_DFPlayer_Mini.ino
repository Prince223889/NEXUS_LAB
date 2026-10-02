/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Lecteur MP3 DFPlayer
 * =====================================================================
 *  Explication : Lit les fichiers MP3 d'une carte microSD avec le DFPlayer Mini.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> DFPlayer VCC
 *   Arduino GND    -> DFPlayer GND
 *   Arduino D10    -> DFPlayer TX
 *   Arduino D11    -> DFPlayer RX (via 1k)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : DFRobotDFPlayerMini
 * =====================================================================
 */
// @libs: DFRobotDFPlayerMini

#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>

// RX Arduino = D10 (vers TX du DFPlayer), TX Arduino = D11 (vers RX)
SoftwareSerial serieMP3(10, 11);
DFRobotDFPlayerMini lecteur;

void setup() {
  Serial.begin(9600);
  serieMP3.begin(9600);
  if (!lecteur.begin(serieMP3)) {
    Serial.println(F("DFPlayer introuvable (verifier carte SD et cablage)"));
    while (true);
  }
  lecteur.volume(20);   // volume 0 à 30
  lecteur.play(1);      // lit 0001.mp3
  Serial.println(F("[95] DFPlayer pret, lecture piste 1"));
}

void loop() {
  // Passe à la piste suivante toutes les 10 secondes
  delay(10000);
  lecteur.next();
  Serial.println(F("Piste suivante"));
}
