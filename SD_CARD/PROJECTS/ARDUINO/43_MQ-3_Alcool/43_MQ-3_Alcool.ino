/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  MQ-3 Alcool
 * =====================================================================
 *  Explication : Mesure un taux relatif de vapeur d'alcool avec un capteur MQ-3 (usage pédagogique uniquement).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MQ-3 VCC
 *   Arduino GND    -> MQ-3 GND
 *   Arduino A0     -> MQ-3 AO
 *   Arduino D2     -> MQ-3 DO
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches et seuils (valeurs indicatives, à ajuster)
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;
const int SEUIL_TRACE    = 200;
const int SEUIL_FORT     = 500;

void setup() {
  pinMode(PIN_NUM, INPUT);
  Serial.begin(9600);
  Serial.println(F("[43] MQ-3 : prechauffage 1 min recommande"));
}

void loop() {
  int valeur = analogRead(PIN_ANALOG);   // valeur relative, pas un taux légal
  Serial.print(F("Alcool (brut): ")); Serial.print(valeur);
  if (valeur < SEUIL_TRACE) Serial.println(F("  -> aucun"));
  else if (valeur < SEUIL_FORT) Serial.println(F("  -> traces"));
  else Serial.println(F("  -> concentration elevee"));
  delay(500);
}
