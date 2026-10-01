/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  LED RGB
 * =====================================================================
 *  Explication : Cycle de couleurs sur une LED RGB cathode commune (PWM).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D9     -> R via 220 ohms
 *   Arduino D10    -> G via 220 ohms
 *   Arduino D11    -> B via 220 ohms
 *   Arduino GND    -> Cathode commune
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_R = 9, PIN_G = 10, PIN_B = 11;

void couleur(uint8_t r, uint8_t g, uint8_t b) {
  analogWrite(PIN_R, r); analogWrite(PIN_G, g); analogWrite(PIN_B, b);
}

void setup() {
  pinMode(PIN_R, OUTPUT); pinMode(PIN_G, OUTPUT); pinMode(PIN_B, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[15] LED RGB prete"));
}

void loop() {
  // Fondu arc-en-ciel : rouge -> vert -> bleu -> rouge
  for (int i = 0; i < 256; i++) { couleur(255 - i, i, 0); delay(8); }
  for (int i = 0; i < 256; i++) { couleur(0, 255 - i, i); delay(8); }
  for (int i = 0; i < 256; i++) { couleur(i, 0, 255 - i); delay(8); }
}
