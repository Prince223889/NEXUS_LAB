/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Bargraphe 10 LED
 * =====================================================================
 *  Explication : Affiche la position d'un potentiomètre sur un bargraphe de 10 LED.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D2     -> LED 1 (via 220 ohms)
 *   Arduino D3     -> LED 2
 *   Arduino D4     -> LED 3
 *   Arduino D5     -> LED 4
 *   Arduino D6     -> LED 5
 *   Arduino D7     -> LED 6
 *   Arduino D8     -> LED 7
 *   Arduino D9     -> LED 8
 *   Arduino D10    -> LED 9
 *   Arduino D11    -> LED 10
 *   Arduino GND    -> Cathodes bargraphe + pot extrémité
 *   Arduino 5V     -> Potentiomètre extrémité
 *   Arduino A0     -> Potentiomètre curseur
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t NB_LED = 10;
const uint8_t LEDS[NB_LED] = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11};
const uint8_t PIN_POT = A0;

void setup() {
  for (uint8_t i = 0; i < NB_LED; i++) pinMode(LEDS[i], OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[88] Bargraphe pret"));
}

void loop() {
  // Nombre de LED à allumer selon le potentiomètre (0 à 10)
  int niveau = map(analogRead(PIN_POT), 0, 1023, 0, NB_LED);
  for (uint8_t i = 0; i < NB_LED; i++) {
    digitalWrite(LEDS[i], i < niveau ? HIGH : LOW);
  }
  Serial.print(F("Niveau: ")); Serial.println(niveau);
  delay(100);
}
