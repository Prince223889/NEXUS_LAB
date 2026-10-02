/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  BME280 Station météo
 * =====================================================================
 *  Explication : Lit température, humidité et pression d'un BME280 en I2C.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> BME280 VCC
 *   Arduino GND    -> BME280 GND
 *   Arduino A4     -> BME280 SDA
 *   Arduino A5     -> BME280 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit BME280 Library, Adafruit Unified Sensor, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit BME280 Library|Adafruit Unified Sensor|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_BME280.h>

// Objet capteur
Adafruit_BME280 bme;

void setup() {
  Serial.begin(9600);
  // Adresse 0x76 (ou 0x77 selon le module)
  if (!bme.begin(0x76)) {
    Serial.println(F("BME280 introuvable, verifier le cablage"));
    while (true) {}
  }
  Serial.println(F("[24] BME280 pret"));
}

void loop() {
  Serial.print(F("Temperature: ")); Serial.print(bme.readTemperature(), 1); Serial.print(F(" C  "));
  Serial.print(F("Humidite: "));    Serial.print(bme.readHumidity(), 1); Serial.print(F(" %  "));
  Serial.print(F("Pression: "));    Serial.print(bme.readPressure() / 100.0, 1); Serial.println(F(" hPa"));
  delay(1000);
}
