/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Ruban LED WS2812B
 * =====================================================================
 *  Explication : Anime un ruban de 8 LED adressables NeoPixel (chenillard puis arc-en-ciel).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Ruban 5V
 *   Arduino GND    -> Ruban GND
 *   Arduino D6     -> Ruban DIN (via 330 ohms)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit NeoPixel
 * =====================================================================
 */
// @libs: Adafruit NeoPixel

#include <Adafruit_NeoPixel.h>

const uint8_t PIN_RUBAN = 6;
const uint8_t NB_LED = 8;

Adafruit_NeoPixel ruban(NB_LED, PIN_RUBAN, NEO_GRB + NEO_KHZ800);

void setup() {
  Serial.begin(9600);
  ruban.begin();
  ruban.setBrightness(50);   // limite la consommation
  ruban.show();              // tout éteint
  Serial.println(F("[83] Ruban NeoPixel pret"));
}

void loop() {
  // Chenillard rouge
  Serial.println(F("Chenillard"));
  for (uint8_t i = 0; i < NB_LED; i++) {
    ruban.clear();
    ruban.setPixelColor(i, ruban.Color(255, 0, 0));
    ruban.show();
    delay(100);
  }
  // Arc-en-ciel
  Serial.println(F("Arc-en-ciel"));
  for (long teinte = 0; teinte < 65536; teinte += 512) {
    for (uint8_t i = 0; i < NB_LED; i++) {
      ruban.setPixelColor(i, ruban.ColorHSV(teinte + i * 65536L / NB_LED));
    }
    ruban.show();
    delay(10);
  }
}
