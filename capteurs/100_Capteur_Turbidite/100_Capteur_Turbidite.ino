/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur de turbidité
 * =====================================================================
 *  Explication : Estime la turbidité (trouble) de l'eau avec un capteur analogique.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Turbidité VCC
 *   Arduino GND    -> Turbidité GND
 *   Arduino A0     -> Turbidité OUT (mode analogique)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_TURBIDITE = A0;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[100] Capteur turbidite pret"));
}

void loop() {
  // Moyenne de 10 lectures
  long somme = 0;
  for (int i = 0; i < 10; i++) { somme += analogRead(PIN_TURBIDITE); delay(10); }
  float tension = (somme / 10.0) * 5.0 / 1023.0;

  // Eau claire ≈ 4,2 V ; plus l'eau est trouble, plus la tension baisse
  float ntu;
  if (tension < 2.5) ntu = 3000;
  else if (tension > 4.2) ntu = 0;
  else ntu = -1120.4 * tension * tension + 5742.3 * tension - 4352.9;   // courbe DFRobot

  Serial.print(F("Tension: ")); Serial.print(tension, 2);
  Serial.print(F(" V  Turbidite: ")); Serial.print(ntu, 0);
  Serial.println(F(" NTU"));
  delay(1000);
}
