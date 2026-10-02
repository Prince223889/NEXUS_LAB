/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  LM35 Température
 * =====================================================================
 *  Explication : Mesure la température avec un LM35 (10 mV par °C) sur une entrée analogique.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> LM35 VCC
 *   Arduino A0     -> LM35 OUT
 *   Arduino GND    -> LM35 GND
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broche analogique du capteur
const uint8_t PIN_LM35 = A0;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[20] LM35 pret"));
}

void loop() {
  // Conversion : 0-1023 -> 0-5000 mV, puis 10 mV = 1 °C
  int brut = analogRead(PIN_LM35);
  float millivolts = brut * (5000.0 / 1023.0);
  float temperature = millivolts / 10.0;
  Serial.print(F("Temperature: ")); Serial.print(temperature, 1); Serial.println(F(" C"));
  delay(1000);
}
