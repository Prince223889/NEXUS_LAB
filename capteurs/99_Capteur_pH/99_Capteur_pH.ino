/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Capteur pH analogique
 * =====================================================================
 *  Explication : Mesure le pH d'une solution avec une sonde et son module analogique.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> Module pH V+
 *   Arduino GND    -> Module pH G
 *   Arduino A0     -> Module pH Po
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

const uint8_t PIN_PH = A0;
// Calibration : ajuster avec les solutions tampons
const float PENTE = -5.70;    // variation du pH par volt
const float DECALAGE = 21.34; // pH à 0 V

void setup() {
  Serial.begin(9600);
  Serial.println(F("[99] Capteur pH pret"));
}

void loop() {
  // Moyenne de 10 lectures pour réduire le bruit
  long somme = 0;
  for (int i = 0; i < 10; i++) { somme += analogRead(PIN_PH); delay(10); }
  float tension = (somme / 10.0) * 5.0 / 1023.0;
  float ph = PENTE * tension + DECALAGE;

  Serial.print(F("Tension: ")); Serial.print(tension, 3);
  Serial.print(F(" V  pH: "));  Serial.println(ph, 2);
  delay(1000);
}
