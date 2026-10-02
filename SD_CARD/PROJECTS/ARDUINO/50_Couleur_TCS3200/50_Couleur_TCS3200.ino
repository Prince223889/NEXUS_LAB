/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur couleur TCS3200
 * =====================================================================
 *  Explication : Mesure les composantes rouge, verte et bleue d'une surface avec pulseIn.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> TCS3200 VCC
 *   Arduino GND    -> TCS3200 GND
 *   Arduino D4     -> TCS3200 S0
 *   Arduino D5     -> TCS3200 S1
 *   Arduino D6     -> TCS3200 S2
 *   Arduino D7     -> TCS3200 S3
 *   Arduino D8     -> TCS3200 OUT
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_S0 = 4;
const uint8_t PIN_S1 = 5;
const uint8_t PIN_S2 = 6;
const uint8_t PIN_S3 = 7;
const uint8_t PIN_OUT = 8;

// Sélectionne un filtre puis mesure la durée d'impulsion (plus c'est court, plus la couleur est forte)
unsigned long lireFiltre(uint8_t s2, uint8_t s3) {
  digitalWrite(PIN_S2, s2);
  digitalWrite(PIN_S3, s3);
  delay(20);
  return pulseIn(PIN_OUT, LOW, 100000UL);
}

void setup() {
  pinMode(PIN_S0, OUTPUT);
  pinMode(PIN_S1, OUTPUT);
  pinMode(PIN_S2, OUTPUT);
  pinMode(PIN_S3, OUTPUT);
  pinMode(PIN_OUT, INPUT);
  // Échelle de fréquence 20 %
  digitalWrite(PIN_S0, HIGH);
  digitalWrite(PIN_S1, LOW);
  Serial.begin(9600);
  Serial.println(F("[50] TCS3200 pret"));
}

void loop() {
  unsigned long rouge = lireFiltre(LOW, LOW);    // filtre rouge
  unsigned long vert  = lireFiltre(HIGH, HIGH);  // filtre vert
  unsigned long bleu  = lireFiltre(LOW, HIGH);   // filtre bleu

  Serial.print(F("R=")); Serial.print(rouge);
  Serial.print(F(" V=")); Serial.print(vert);
  Serial.print(F(" B=")); Serial.print(bleu);

  // Couleur dominante = durée la plus courte
  if (rouge < vert && rouge < bleu) Serial.println(F("  -> ROUGE"));
  else if (vert < rouge && vert < bleu) Serial.println(F("  -> VERT"));
  else Serial.println(F("  -> BLEU"));
  delay(500);
}
