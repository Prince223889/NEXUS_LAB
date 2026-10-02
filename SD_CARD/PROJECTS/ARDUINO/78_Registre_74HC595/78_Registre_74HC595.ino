/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  74HC595 + 8 LED
 * =====================================================================
 *  Explication : Pilote 8 LED avec seulement 3 broches grâce au registre à décalage 74HC595.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> 74HC595 VCC (16) + MR (10)
 *   Arduino GND    -> 74HC595 GND (8) + OE (13)
 *   Arduino D11    -> 74HC595 DS (14)
 *   Arduino D12    -> 74HC595 SH_CP (11)
 *   Arduino D8     -> 74HC595 ST_CP (12)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches du registre
const uint8_t PIN_DATA  = 11;  // DS
const uint8_t PIN_CLOCK = 12;  // SH_CP
const uint8_t PIN_LATCH = 8;   // ST_CP

// Envoie un octet au registre (1 bit = 1 LED)
void envoyer(byte valeur) {
  digitalWrite(PIN_LATCH, LOW);
  shiftOut(PIN_DATA, PIN_CLOCK, MSBFIRST, valeur);
  digitalWrite(PIN_LATCH, HIGH);   // copie vers les sorties
}

void setup() {
  pinMode(PIN_DATA, OUTPUT);
  pinMode(PIN_CLOCK, OUTPUT);
  pinMode(PIN_LATCH, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[78] 74HC595 pret"));
}

void loop() {
  // Chenillard : une LED allumée à la fois
  for (uint8_t i = 0; i < 8; i++) {
    envoyer(1 << i);
    Serial.print(F("LED ")); Serial.println(i);
    delay(200);
  }
}
