/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur de flamme IR
 * =====================================================================
 *  Explication : Détecte une flamme par infrarouge et affiche l'intensité mesurée.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Flamme VCC
 *   Arduino GND    -> Flamme GND
 *   Arduino A0     -> Flamme A0
 *   Arduino D2     -> Flamme D0
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches du module
const uint8_t PIN_ANALOG = A0;
const uint8_t PIN_NUM    = 2;
const uint8_t PIN_LED    = 13;   // LED intégrée

void setup() {
  pinMode(PIN_NUM, INPUT);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[30] Capteur de flamme pret"));
}

void loop() {
  int intensite = analogRead(PIN_ANALOG);          // plus la valeur est basse, plus la flamme est proche
  bool flamme = digitalRead(PIN_NUM) == LOW;       // sortie active à l'état bas
  digitalWrite(PIN_LED, flamme ? HIGH : LOW);
  Serial.print(F("Analogique: ")); Serial.print(intensite);
  Serial.println(flamme ? F("  -> FLAMME DETECTEE") : F("  -> rien"));
  delay(200);
}
