/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur de flexion
 * =====================================================================
 *  Explication : Mesure l'angle de pliage d'un capteur de flexion (flex sensor).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Flex patte 1
 *   Arduino A0     -> Flex patte 2 + résistance 47k
 *   Arduino GND    -> Résistance 47k (autre patte)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_FLEX = A0;

// Valeurs à ajuster : lecture capteur à plat et plié à 90°
const int VAL_PLAT = 700;
const int VAL_PLIE = 450;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[52] Capteur de flexion pret"));
}

void loop() {
  int valeur = analogRead(PIN_FLEX);
  // Conversion approximative en angle
  int angle = map(valeur, VAL_PLAT, VAL_PLIE, 0, 90);
  Serial.print(F("Brut: "));
  Serial.print(valeur);
  Serial.print(F("  Angle: "));
  Serial.print(angle);
  Serial.println(F(" deg"));
  delay(200);
}
