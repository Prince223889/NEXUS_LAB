/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur tension 0-25V
 * =====================================================================
 *  Explication : Mesure une tension jusqu'à 25 V grâce à un pont diviseur 30k/7,5k.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino A0     -> Module S
 *   Arduino GND    -> Module -
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_V = A0;
const float RAPPORT = 5.0;   // (30k + 7,5k) / 7,5k

void setup() {
  Serial.begin(9600);
  Serial.println(F("[55] Capteur tension 0-25V pret"));
}

void loop() {
  // Tension lue sur A0 puis multipliée par le rapport du diviseur
  float vA0 = analogRead(PIN_V) * 5.0 / 1023.0;
  float vMesuree = vA0 * RAPPORT;
  Serial.print(F("Tension: "));
  Serial.print(vMesuree, 2);
  Serial.println(F(" V"));
  delay(500);
}
