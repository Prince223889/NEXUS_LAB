/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  TCRT5000 Suiveur de ligne
 * =====================================================================
 *  Explication : Distingue une ligne noire d'une surface blanche avec un capteur réfléchissant TCRT5000.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> TCRT5000 VCC
 *   Arduino GND    -> TCRT5000 GND
 *   Arduino A0     -> TCRT5000 A0
 *   Arduino D2     -> TCRT5000 D0
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches du module
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;
const uint8_t PIN_LED    = 13;

void setup() {
  pinMode(PIN_NUM, INPUT);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[40] TCRT5000 pret"));
}

void loop() {
  int reflexion = analogRead(PIN_ANALOG);          // valeur haute = peu de lumière réfléchie (noir)
  bool ligneNoire = digitalRead(PIN_NUM) == HIGH;  // HIGH = surface noire
  digitalWrite(PIN_LED, ligneNoire ? HIGH : LOW);
  Serial.print(F("Analogique: ")); Serial.print(reflexion);
  Serial.println(ligneNoire ? F("  -> LIGNE NOIRE") : F("  -> blanc"));
  delay(100);
}
