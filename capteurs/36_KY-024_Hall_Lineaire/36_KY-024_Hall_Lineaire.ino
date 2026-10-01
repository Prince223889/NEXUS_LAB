/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  KY-024 Hall linéaire
 * =====================================================================
 *  Explication : Mesure l'intensité et la polarité d'un champ magnétique avec un capteur Hall linéaire KY-024.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> KY-024 +
 *   Arduino GND    -> KY-024 G
 *   Arduino A0     -> KY-024 A0
 *   Arduino D2     -> KY-024 D0
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches du module
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;
int zero = 512;                    // valeur sans aimant (calibrée au démarrage)

void setup() {
  pinMode(PIN_NUM, INPUT);
  Serial.begin(9600);
  // Calibration : moyenne de 20 lectures sans aimant
  long somme = 0;
  for (int i = 0; i < 20; i++) { somme += analogRead(PIN_ANALOG); delay(10); }
  zero = somme / 20;
  Serial.print(F("[36] KY-024 pret, zero = ")); Serial.println(zero);
}

void loop() {
  int ecart = analogRead(PIN_ANALOG) - zero;   // signe = polarité, valeur = intensité
  Serial.print(F("Champ: ")); Serial.print(ecart);
  if (ecart > 20) Serial.print(F("  (pole +)"));
  else if (ecart < -20) Serial.print(F("  (pole -)"));
  Serial.print(F("  Seuil: ")); Serial.println(digitalRead(PIN_NUM) ? F("depasse") : F("non"));
  delay(200);
}
