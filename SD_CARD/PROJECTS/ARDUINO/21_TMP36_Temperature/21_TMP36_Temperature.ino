/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  TMP36 Température
 * =====================================================================
 *  Explication : Mesure la température avec un TMP36 (500 mV à 0 °C, 10 mV par °C).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> TMP36 VCC
 *   Arduino A0     -> TMP36 OUT
 *   Arduino GND    -> TMP36 GND
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : aucune
 * =====================================================================
 */
// @libs: 

// Broche analogique du capteur
const uint8_t PIN_TMP36 = A0;

void setup() {
  Serial.begin(9600);
  Serial.println(F("[21] TMP36 pret"));
}

void loop() {
  // Conversion en millivolts puis en °C (décalage de 500 mV)
  int brut = analogRead(PIN_TMP36);
  float millivolts = brut * (5000.0 / 1023.0);
  float temperature = (millivolts - 500.0) / 10.0;
  Serial.print(F("Temperature: ")); Serial.print(temperature, 1); Serial.println(F(" C"));
  delay(1000);
}
