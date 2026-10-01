/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  MQ-2 Gaz / Fumée
 * =====================================================================
 *  Explication : Détection de gaz/fumée (sortie analogique + seuil) avec alarme buzzer.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MQ-2 VCC
 *   Arduino GND    -> MQ-2 GND
 *   Arduino A0     -> MQ-2 AO
 *   Arduino D8     -> Buzzer +
 *   Arduino GND    -> Buzzer -
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_MQ2    = A0;
const uint8_t PIN_BUZZER = 8;
const int SEUIL_ALARME   = 400;          // à calibrer à l'air propre
const unsigned long PRECHAUFFE_MS = 20000UL;

void setup() {
  pinMode(PIN_BUZZER, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[12] MQ-2 : prechauffage 20 s..."));
  delay(PRECHAUFFE_MS);
}

void loop() {
  int niveau = analogRead(PIN_MQ2);
  bool alarme = niveau > SEUIL_ALARME;
  digitalWrite(PIN_BUZZER, alarme);
  Serial.print(F("Gaz=")); Serial.print(niveau);
  Serial.println(alarme ? F("  !!! ALARME !!!") : F("  OK"));
  delay(500);
}
