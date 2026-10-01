/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  GUVA-S12SD Ultraviolet
 * =====================================================================
 *  Explication : Mesure le rayonnement UV et estime l'indice UV avec un capteur GUVA-S12SD.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> UV VCC
 *   Arduino GND    -> UV GND
 *   Arduino A0     -> UV SIG
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broche analogique du capteur
const uint8_t PIN_UV = A0;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[44] GUVA-S12SD pret"));
}

void loop() {
  // Conversion en millivolts puis en indice UV (environ 0,1 V par point d'indice)
  int brut = analogRead(PIN_UV);
  float millivolts = brut * (5000.0 / 1023.0);
  float indiceUV = millivolts / 100.0;
  Serial.print(F("Tension: ")); Serial.print(millivolts, 0); Serial.print(F(" mV  "));
  Serial.print(F("Indice UV: ")); Serial.println(indiceUV, 1);
  delay(1000);
}
