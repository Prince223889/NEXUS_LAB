/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Moteur DC L298N
 * =====================================================================
 *  Explication : Fait tourner un moteur DC dans les deux sens avec variation de vitesse via un L298N.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino GND    -> L298N GND (commun avec alim externe)
 *   Arduino D5     -> L298N ENA (retirer cavalier)
 *   Arduino D7     -> L298N IN1
 *   Arduino D8     -> L298N IN2
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broches de commande
const uint8_t PIN_ENA = 5;   // PWM vitesse
const uint8_t PIN_IN1 = 7;   // sens
const uint8_t PIN_IN2 = 8;   // sens

// Fixe le sens (true = avant) et la vitesse (0 à 255)
void moteur(bool avant, uint8_t vitesse) {
  digitalWrite(PIN_IN1, avant ? HIGH : LOW);
  digitalWrite(PIN_IN2, avant ? LOW : HIGH);
  analogWrite(PIN_ENA, vitesse);
}

void arret() {
  analogWrite(PIN_ENA, 0);
}

void setup() {
  pinMode(PIN_ENA, OUTPUT);
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("[79] L298N pret"));
}

void loop() {
  Serial.println(F("Avant, mi-vitesse"));
  moteur(true, 150);  delay(2000);
  Serial.println(F("Avant, pleine vitesse"));
  moteur(true, 255);  delay(2000);
  Serial.println(F("Arret"));
  arret();            delay(1000);
  Serial.println(F("Arriere"));
  moteur(false, 200); delay(2000);
  arret();            delay(1000);
}
