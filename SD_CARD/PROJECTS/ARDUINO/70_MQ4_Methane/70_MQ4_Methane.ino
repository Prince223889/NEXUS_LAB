/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  MQ-4 méthane
 * =====================================================================
 *  Explication : Détecte la présence de méthane (gaz naturel) avec le capteur MQ-4.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MQ-4 VCC
 *   Arduino GND    -> MQ-4 GND
 *   Arduino A0     -> MQ-4 AO
 *   Arduino D2     -> MQ-4 DO
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_AO = A0;
const uint8_t PIN_DO = 2;
const int SEUIL = 400;   // seuil d'alerte à ajuster

void setup() {
  pinMode(PIN_DO, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[70] MQ-4 : prechauffage 1 a 2 minutes..."));
}

void loop() {
  int valeur = analogRead(PIN_AO);        // niveau analogique
  bool seuilModule = digitalRead(PIN_DO) == LOW;   // seuil réglé par le potentiomètre

  Serial.print(F("Methane (brut): "));
  Serial.print(valeur);

  if (valeur > SEUIL || seuilModule) {
    Serial.println(F("  ALERTE GAZ !"));
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    Serial.println(F("  normal"));
    digitalWrite(LED_BUILTIN, LOW);
  }
  delay(500);
}
