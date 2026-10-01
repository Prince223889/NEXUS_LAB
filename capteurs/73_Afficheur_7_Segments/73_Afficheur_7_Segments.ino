/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Afficheur 7 segments
 * =====================================================================
 *  Explication : Compte de 0 à 9 sur un afficheur 7 segments à cathode commune, sans bibliothèque.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino D2     -> Segment a (via 220 ohms)
 *   Arduino D3     -> Segment b (via 220 ohms)
 *   Arduino D4     -> Segment c (via 220 ohms)
 *   Arduino D5     -> Segment d (via 220 ohms)
 *   Arduino D6     -> Segment e (via 220 ohms)
 *   Arduino D7     -> Segment f (via 220 ohms)
 *   Arduino D8     -> Segment g (via 220 ohms)
 *   Arduino GND    -> Cathode commune
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches des segments a, b, c, d, e, f, g
const uint8_t SEGMENTS[7] = {2, 3, 4, 5, 6, 7, 8};

// Motifs des chiffres 0 à 9 (bit 0 = a ... bit 6 = g)
const uint8_t CHIFFRES[10] = {
  0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F
};

// Affiche un chiffre en allumant les segments nécessaires
void afficherChiffre(uint8_t n) {
  for (uint8_t i = 0; i < 7; i++) {
    digitalWrite(SEGMENTS[i], (CHIFFRES[n] >> i) & 1);
  }
}

void setup() {
  for (uint8_t i = 0; i < 7; i++) pinMode(SEGMENTS[i], OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[73] Afficheur 7 segments pret"));
}

void loop() {
  // Compte de 0 à 9
  for (uint8_t n = 0; n < 10; n++) {
    afficherChiffre(n);
    Serial.print(F("Chiffre: ")); Serial.println(n);
    delay(1000);
  }
}
