/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Interrupteur Reed
 * =====================================================================
 *  Explication : Détecte l'ouverture ou la fermeture d'une porte avec un interrupteur Reed et un aimant.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D2     -> Reed broche 1
 *   Arduino GND    -> Reed broche 2
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches
const uint8_t PIN_REED = 2;
const uint8_t PIN_LED  = 13;

int etatPrecedent = -1;

void setup() {
  pinMode(PIN_REED, INPUT_PULLUP);   // LOW = contact fermé (aimant proche)
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[37] Interrupteur Reed pret"));
}

void loop() {
  int etat = digitalRead(PIN_REED);
  digitalWrite(PIN_LED, etat == LOW ? HIGH : LOW);
  // Affiche seulement lors d'un changement
  if (etat != etatPrecedent) {
    Serial.println(etat == LOW ? F("Porte fermee (aimant proche)") : F("Porte OUVERTE"));
    etatPrecedent = etat;
  }
  delay(50);                          // anti-rebond simple
}
