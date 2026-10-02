/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  BMP280 Pression
 * =====================================================================
 *  Explication : Lit la température, la pression et l'altitude estimée d'un BMP280 en I2C.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> BMP280 VCC
 *   Arduino GND    -> BMP280 GND
 *   Arduino A4     -> BMP280 SDA
 *   Arduino A5     -> BMP280 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit BMP280 Library, Adafruit Unified Sensor, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit BMP280 Library|Adafruit Unified Sensor|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_BMP280.h>

// Objet capteur et pression au niveau de la mer (hPa)
Adafruit_BMP280 bmp;
const float PRESSION_MER_HPA = 1013.25;

void setup() {
  Serial.begin(9600);
  // Adresse 0x76 (ou 0x77 selon le module)
  if (!bmp.begin(0x76)) {
    Serial.println(F("BMP280 introuvable, verifier le cablage"));
    while (true) {}
  }
  Serial.println(F("[23] BMP280 pret"));
}

void loop() {
  Serial.print(F("Temperature: ")); Serial.print(bmp.readTemperature(), 1); Serial.print(F(" C  "));
  Serial.print(F("Pression: "));    Serial.print(bmp.readPressure() / 100.0, 1); Serial.print(F(" hPa  "));
  Serial.print(F("Altitude: "));    Serial.print(bmp.readAltitude(PRESSION_MER_HPA), 0); Serial.println(F(" m"));
  delay(1000);
}
