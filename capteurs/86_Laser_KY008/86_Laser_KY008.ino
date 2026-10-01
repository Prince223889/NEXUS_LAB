/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Module laser KY-008
 * =====================================================================
 *  Explication : Fait clignoter le module laser KY-008 (ne jamais viser les yeux).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D7     -> KY-008 S
 *   Arduino GND    -> KY-008 -
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_LASER = 7;

void setup() {
  pinMode(PIN_LASER, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[86] Laser pret - ne jamais viser les yeux !"));
}

void loop() {
  // Allume le laser 1 s puis l'éteint 1 s
  digitalWrite(PIN_LASER, HIGH);
  Serial.println(F("Laser ON"));
  delay(1000);
  digitalWrite(PIN_LASER, LOW);
  Serial.println(F("Laser OFF"));
  delay(1000);
}
