/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  HTU21D Température/Humidité
 * =====================================================================
 *  Explication : Lit la température et l'humidité d'un HTU21D en I2C.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> HTU21D VCC
 *   Arduino GND    -> HTU21D GND
 *   Arduino A4     -> HTU21D SDA
 *   Arduino A5     -> HTU21D SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit HTU21DF Library, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit HTU21DF Library|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_HTU21DF.h>

// Objet capteur
Adafruit_HTU21DF htu;

void setup() {
  Serial.begin(9600);
  if (!htu.begin()) {
    Serial.println(F("HTU21D introuvable, verifier le cablage"));
    while (true) {}
  }
  Serial.println(F("[27] HTU21D pret"));
}

void loop() {
  Serial.print(F("Temperature: ")); Serial.print(htu.readTemperature(), 1); Serial.print(F(" C  "));
  Serial.print(F("Humidite: "));    Serial.print(htu.readHumidity(), 1); Serial.println(F(" %"));
  delay(1000);
}
