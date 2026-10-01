/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Buzzer passif
 * =====================================================================
 *  Explication : Joue une mélodie (gamme) sur un buzzer passif avec tone().
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
// Gamme de Do majeur (Hz) et durées (ms)
const int NOTES[]  = {262, 294, 330, 349, 392, 440, 494, 523};
const int DUREE_MS = 250;
const uint8_t NB_NOTES = sizeof(NOTES) / sizeof(NOTES[0]);

void setup() {
  Serial.begin(9600);
  Serial.println(F("[11] Buzzer pret"));
}

void loop() {
  for (uint8_t i = 0; i < NB_NOTES; i++) {
    tone(PIN_BUZZER, NOTES[i], DUREE_MS);
    delay(DUREE_MS * 1.3);               // petite pause entre les notes
  }
  noTone(PIN_BUZZER);
  delay(2000);
}
