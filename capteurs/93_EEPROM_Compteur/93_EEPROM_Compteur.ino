/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  EEPROM compteur
 * =====================================================================
 *  Explication : Compte le nombre de démarrages de la carte et le mémorise en EEPROM interne.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   (aucun câblage : la carte Arduino seule suffit)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

#include <EEPROM.h>

const int ADRESSE = 0;   // emplacement en EEPROM

void setup() {
  Serial.begin(9600);
  // Lecture de l'ancien compteur
  unsigned long demarrages;
  EEPROM.get(ADRESSE, demarrages);
  if (demarrages == 0xFFFFFFFF) demarrages = 0;   // EEPROM vierge

  // Incrément et sauvegarde (put n'écrit que si la valeur change)
  demarrages++;
  EEPROM.put(ADRESSE, demarrages);

  Serial.println(F("[93] EEPROM"));
  Serial.print(F("Nombre de demarrages: "));
  Serial.println(demarrages);
  Serial.println(F("Appuyer sur RESET pour incrementer"));
}

void loop() {
  // Rien : tout se passe au démarrage
}
