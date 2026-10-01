/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  MQ-135 Qualité de l'air
 * =====================================================================
 *  Explication : Mesure un indice relatif de qualité de l'air avec un capteur de gaz MQ-135.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MQ-135 VCC
 *   Arduino GND    -> MQ-135 GND
 *   Arduino A0     -> MQ-135 AO
 *   Arduino D2     -> MQ-135 DO
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches et seuils (valeurs indicatives, à ajuster)
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;
const int SEUIL_MOYEN    = 300;
const int SEUIL_MAUVAIS  = 500;

void setup() {
  pinMode(PIN_NUM, INPUT);
  Serial.begin(9600);
  Serial.println(F("[41] MQ-135 : prechauffage 1 min recommande"));
}

void loop() {
  int valeur = analogRead(PIN_ANALOG);   // plus la valeur est haute, plus l'air est pollué
  Serial.print(F("Indice air: ")); Serial.print(valeur);
  if (valeur < SEUIL_MOYEN) Serial.print(F("  -> bon"));
  else if (valeur < SEUIL_MAUVAIS) Serial.print(F("  -> moyen"));
  else Serial.print(F("  -> mauvais, aerer !"));
  if (digitalRead(PIN_NUM) == LOW) Serial.print(F("  [alarme module]"));
  Serial.println();
  delay(1000);
}
