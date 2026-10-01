/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur courant ACS712-5A
 * =====================================================================
 *  Explication : Mesure un courant continu jusqu'à 5 A avec un capteur à effet Hall.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> ACS712 VCC
 *   Arduino GND    -> ACS712 GND
 *   Arduino A0     -> ACS712 OUT
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_ACS = A0;
const float SENSIBILITE = 0.185;   // 185 mV par ampère (version 5 A)
const float OFFSET = 2.5;          // tension de sortie à 0 A

void setup() {
  Serial.begin(9600);
  Serial.println(F("[54] ACS712-5A pret"));
}

void loop() {
  // Moyenne de 100 lectures pour réduire le bruit
  long somme = 0;
  for (int i = 0; i < 100; i++) somme += analogRead(PIN_ACS);
  float tension = (somme / 100.0) * 5.0 / 1023.0;

  // Conversion tension -> courant
  float courant = (tension - OFFSET) / SENSIBILITE;
  Serial.print(F("Courant: "));
  Serial.print(courant, 2);
  Serial.println(F(" A"));
  delay(500);
}
