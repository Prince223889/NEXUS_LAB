/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Humidité du sol
 * =====================================================================
 *  Explication : Capteur capacitif/résistif d'humidité du sol converti en pourcentage.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Capteur VCC
 *   Arduino GND    -> Capteur GND
 *   Arduino A0     -> Capteur AOUT
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_SOL = A0;
// Calibration : valeur dans l'air (sec) et dans l'eau (mouillé)
const int VAL_SEC    = 620;
const int VAL_MOUILLE = 280;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[13] Capteur sol pret"));
}

void loop() {
  int brut = analogRead(PIN_SOL);
  int pct = constrain(map(brut, VAL_SEC, VAL_MOUILLE, 0, 100), 0, 100);
  Serial.print(F("Brut=")); Serial.print(brut);
  Serial.print(F("  Humidite sol=")); Serial.print(pct); Serial.println(F(" %"));
  delay(1000);
}
