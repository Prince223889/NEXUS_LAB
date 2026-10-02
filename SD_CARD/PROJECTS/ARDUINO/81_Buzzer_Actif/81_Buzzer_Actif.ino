/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Buzzer actif
 * =====================================================================
 *  Explication : Émet des bips réguliers avec un buzzer actif (simple marche/arrêt).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D8     -> Buzzer +
 *   Arduino GND    -> Buzzer -
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_BUZZER = 8;

// Émet un bip de durée donnée (ms)
void bip(unsigned int duree) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(duree);
  digitalWrite(PIN_BUZZER, LOW);
}

void setup() {
  pinMode(PIN_BUZZER, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[81] Buzzer actif pret"));
}

void loop() {
  // Deux bips courts puis un long
  Serial.println(F("Bip bip biiip"));
  bip(100); delay(100);
  bip(100); delay(100);
  bip(500);
  delay(2000);
}
