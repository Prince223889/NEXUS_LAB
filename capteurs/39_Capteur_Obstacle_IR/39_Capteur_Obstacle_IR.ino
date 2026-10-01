/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur d'obstacle IR
 * =====================================================================
 *  Explication : Détecte un obstacle proche avec un module infrarouge émetteur/récepteur.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Module VCC
 *   Arduino GND    -> Module GND
 *   Arduino D2     -> Module OUT
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches
const uint8_t PIN_IR  = 2;
const uint8_t PIN_LED = 13;

int etatPrecedent = HIGH;

void setup() {
  pinMode(PIN_IR, INPUT);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[39] Capteur d'obstacle IR pret"));
}

void loop() {
  int etat = digitalRead(PIN_IR);      // LOW = obstacle détecté
  digitalWrite(PIN_LED, etat == LOW ? HIGH : LOW);
  // Affiche seulement lors d'un changement
  if (etat != etatPrecedent) {
    Serial.println(etat == LOW ? F("Obstacle detecte !") : F("Voie libre"));
    etatPrecedent = etat;
  }
  delay(20);
}
