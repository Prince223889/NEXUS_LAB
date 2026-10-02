/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  A3144 Effet Hall
 * =====================================================================
 *  Explication : Détecte la présence d'un aimant avec un capteur à effet Hall A3144 (sortie numérique).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> A3144 VCC
 *   Arduino GND    -> A3144 GND
 *   Arduino D2     -> A3144 OUT
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches
const uint8_t PIN_HALL = 2;
const uint8_t PIN_LED  = 13;

int etatPrecedent = HIGH;

void setup() {
  pinMode(PIN_HALL, INPUT_PULLUP);   // sortie à collecteur ouvert : pull-up nécessaire
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[35] A3144 pret"));
}

void loop() {
  int etat = digitalRead(PIN_HALL);  // LOW = aimant détecté
  digitalWrite(PIN_LED, etat == LOW ? HIGH : LOW);
  // Affiche seulement lors d'un changement
  if (etat != etatPrecedent) {
    Serial.println(etat == LOW ? F("Aimant detecte") : F("Pas d'aimant"));
    etatPrecedent = etat;
  }
  delay(20);
}
