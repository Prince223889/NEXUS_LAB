/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  LED Blink
 * =====================================================================
 *  Explication : Clignotement d'une LED externe sans delay() (millis).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D13    -> LED anode (+) via 220 ohms
 *   Arduino GND    -> LED cathode (-)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_LED = 13;              // LED externe (ou LED intégrée)
const unsigned long PERIODE_MS = 500;    // demi-période de clignotement

unsigned long dernierChangement = 0;
bool etatLed = false;

void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[01] LED Blink pret"));
}

void loop() {
  // Non bloquant : on compare le temps écoulé au lieu d'attendre
  if (millis() - dernierChangement >= PERIODE_MS) {
    dernierChangement = millis();
    etatLed = !etatLed;
    digitalWrite(PIN_LED, etatLed ? HIGH : LOW);
  }
}
