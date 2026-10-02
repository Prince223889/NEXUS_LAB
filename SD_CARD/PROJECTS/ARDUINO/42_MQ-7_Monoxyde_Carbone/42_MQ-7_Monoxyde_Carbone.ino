/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  MQ-7 Monoxyde de carbone
 * =====================================================================
 *  Explication : Détecte la présence de monoxyde de carbone (CO) avec un capteur MQ-7 et déclenche une alarme.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MQ-7 VCC
 *   Arduino GND    -> MQ-7 GND
 *   Arduino A0     -> MQ-7 AO
 *   Arduino D2     -> MQ-7 DO
 *   Arduino D8     -> Buzzer +
 *   Arduino GND    -> Buzzer -
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches et seuil d'alarme (valeur indicative, à ajuster)
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;
const uint8_t PIN_BUZZER = 8;
const int SEUIL_ALARME   = 400;

void setup() {
  pinMode(PIN_NUM, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[42] MQ-7 : prechauffage 1 min recommande"));
}

void loop() {
  int valeur = analogRead(PIN_ANALOG);   // valeur relative au taux de CO
  bool alarme = valeur > SEUIL_ALARME || digitalRead(PIN_NUM) == LOW;
  digitalWrite(PIN_BUZZER, alarme ? HIGH : LOW);
  Serial.print(F("CO (brut): ")); Serial.print(valeur);
  Serial.println(alarme ? F("  -> ALERTE CO !") : F("  -> normal"));
  delay(500);
}
