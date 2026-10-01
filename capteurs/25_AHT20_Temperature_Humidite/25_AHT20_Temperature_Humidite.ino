/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  AHT20 Température/Humidité
 * =====================================================================
 *  Explication : Lit la température et l'humidité d'un AHT20 en I2C.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> AHT20 VCC
 *   Arduino GND    -> AHT20 GND
 *   Arduino A4     -> AHT20 SDA
 *   Arduino A5     -> AHT20 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit AHTX0, Adafruit BusIO, Adafruit Unified Sensor
 * =====================================================================
 */
// @libs: Adafruit AHTX0|Adafruit BusIO|Adafruit Unified Sensor

#include <Wire.h>
#include <Adafruit_AHTX0.h>

// Objet capteur
Adafruit_AHTX0 aht;

void setup() {
  Serial.begin(9600);
  if (!aht.begin()) {
    Serial.println(F("AHT20 introuvable, verifier le cablage"));
    while (true) {}
  }
  Serial.println(F("[25] AHT20 pret"));
}

void loop() {
  // Lecture des deux grandeurs sous forme d'événements
  sensors_event_t humidite, temperature;
  aht.getEvent(&humidite, &temperature);
  Serial.print(F("Temperature: ")); Serial.print(temperature.temperature, 1); Serial.print(F(" C  "));
  Serial.print(F("Humidite: "));    Serial.print(humidite.relative_humidity, 1); Serial.println(F(" %"));
  delay(1000);
}
