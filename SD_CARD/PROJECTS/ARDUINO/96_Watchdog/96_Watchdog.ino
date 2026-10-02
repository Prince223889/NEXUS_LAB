/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Watchdog
 * =====================================================================
 *  Explication : Démontre le chien de garde : la carte redémarre seule si le programme se bloque.
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

#include <avr/wdt.h>

void setup() {
  wdt_disable();              // désactivé pendant l'initialisation
  Serial.begin(9600);
  Serial.println(F("[96] Watchdog - demarrage"));
  wdt_enable(WDTO_2S);        // reset si pas de wdt_reset() pendant 2 s
}

void loop() {
  // Fonctionnement normal : on nourrit le chien de garde
  for (int i = 0; i < 5; i++) {
    Serial.print(F("Tout va bien ")); Serial.println(i);
    wdt_reset();
    delay(500);
  }
  // Simulation d'un blocage : plus de wdt_reset()
  Serial.println(F("Blocage simule... redemarrage dans 2 s"));
  while (true);
}
