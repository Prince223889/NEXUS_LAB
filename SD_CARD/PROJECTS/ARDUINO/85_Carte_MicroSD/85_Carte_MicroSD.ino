/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Carte microSD
 * =====================================================================
 *  Explication : Écrit une ligne dans un fichier sur carte microSD puis relit le fichier.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> SD VCC
 *   Arduino GND    -> SD GND
 *   Arduino D10    -> SD CS
 *   Arduino D11    -> SD MOSI
 *   Arduino D12    -> SD MISO
 *   Arduino D13    -> SD SCK
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : SD
 * =====================================================================
 */
// @libs: SD

#include <SPI.h>
#include <SD.h>

const uint8_t PIN_CS = 10;

void setup() {
  Serial.begin(9600);
  // Initialisation de la carte
  if (!SD.begin(PIN_CS)) {
    Serial.println(F("Carte SD introuvable"));
    while (true);
  }
  Serial.println(F("[85] Carte SD prete"));

  // Écriture (ajout en fin de fichier)
  File fichier = SD.open("test.txt", FILE_WRITE);
  if (fichier) {
    fichier.print(F("Demarrage a "));
    fichier.print(millis());
    fichier.println(F(" ms"));
    fichier.close();
    Serial.println(F("Ecriture OK"));
  } else {
    Serial.println(F("Erreur ouverture en ecriture"));
  }

  // Lecture du fichier complet
  fichier = SD.open("test.txt");
  if (fichier) {
    Serial.println(F("Contenu de test.txt :"));
    while (fichier.available()) Serial.write(fichier.read());
    fichier.close();
  } else {
    Serial.println(F("Erreur ouverture en lecture"));
  }
}

void loop() {
  // Rien à faire en boucle
}
