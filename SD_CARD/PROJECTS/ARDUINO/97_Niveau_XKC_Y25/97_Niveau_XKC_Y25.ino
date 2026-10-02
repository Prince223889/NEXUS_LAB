/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Niveau sans contact XKC-Y25
 * =====================================================================
 *  Explication : Détecte la présence de liquide à travers la paroi d'un récipient.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> XKC-Y25 VCC (marron)
 *   Arduino GND    -> XKC-Y25 GND (bleu)
 *   Arduino D2     -> XKC-Y25 OUT (jaune)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_CAPTEUR = 2;

void setup() {
  pinMode(PIN_CAPTEUR, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[97] XKC-Y25 pret"));
}

void loop() {
  // Sortie HIGH quand du liquide est détecté (version V/PNP)
  bool liquide = digitalRead(PIN_CAPTEUR) == HIGH;
  digitalWrite(LED_BUILTIN, liquide ? HIGH : LOW);
  Serial.println(liquide ? F("Liquide detecte") : F("Pas de liquide"));
  delay(500);
}
