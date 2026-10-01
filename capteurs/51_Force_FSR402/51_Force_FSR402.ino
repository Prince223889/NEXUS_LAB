/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur de force FSR402
 * =====================================================================
 *  Explication : Mesure la pression exercée sur une résistance sensible à la force.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> FSR patte 1
 *   Arduino A0     -> FSR patte 2 + résistance 10k
 *   Arduino GND    -> Résistance 10k (autre patte)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_FSR = A0;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[51] FSR402 pret"));
}

void loop() {
  // Lecture du pont diviseur FSR / 10k
  int valeur = analogRead(PIN_FSR);
  Serial.print(F("Valeur: "));
  Serial.print(valeur);

  // Interprétation grossière
  if (valeur < 10)       Serial.println(F("  aucune pression"));
  else if (valeur < 200) Serial.println(F("  contact leger"));
  else if (valeur < 600) Serial.println(F("  pression moyenne"));
  else                   Serial.println(F("  forte pression"));
  delay(200);
}
