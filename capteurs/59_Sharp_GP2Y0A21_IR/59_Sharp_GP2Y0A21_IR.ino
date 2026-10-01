/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Sharp GP2Y0A21 IR
 * =====================================================================
 *  Explication : Mesure une distance de 10 à 80 cm avec un capteur infrarouge analogique.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Sharp VCC (rouge)
 *   Arduino GND    -> Sharp GND (noir)
 *   Arduino A0     -> Sharp Vo (jaune)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_SHARP = A0;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[59] Sharp GP2Y0A21 pret"));
}

void loop() {
  // Moyenne de 10 lectures
  long somme = 0;
  for (int i = 0; i < 10; i++) somme += analogRead(PIN_SHARP);
  float tension = (somme / 10.0) * 5.0 / 1023.0;

  // Courbe approximative du fabricant
  if (tension < 0.4) {
    Serial.println(F("Hors de portee"));
  } else {
    float distance = 29.988 * pow(tension, -1.173);
    Serial.print(F("Distance: "));
    Serial.print(distance, 1);
    Serial.println(F(" cm"));
  }
  delay(200);
}
