/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  DHT22 Température/Humidité
 * =====================================================================
 *  Explication : Lit la température et l'humidité d'un DHT22 toutes les 2 secondes.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> DHT22 VCC
 *   Arduino D2     -> DHT22 DATA
 *   Arduino GND    -> DHT22 GND
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : DHT sensor library, Adafruit Unified Sensor
 * =====================================================================
 */
// @libs: DHT sensor library|Adafruit Unified Sensor

#include <DHT.h>

// Broche et type du capteur
const uint8_t PIN_DHT = 2;
DHT dht(PIN_DHT, DHT22);

void setup() {
  Serial.begin(9600);
  dht.begin();                          // initialise le capteur
  Serial.println(F("[19] DHT22 pret"));
}

void loop() {
  delay(2000);                          // le DHT22 a besoin de 2 s entre deux mesures
  float h = dht.readHumidity();
  float t = dht.readTemperature();      // en °C
  // Vérifie que la lecture est valide
  if (isnan(h) || isnan(t)) {
    Serial.println(F("Erreur de lecture DHT22"));
    return;
  }
  Serial.print(F("Temperature: ")); Serial.print(t, 1); Serial.print(F(" C  "));
  Serial.print(F("Humidite: "));    Serial.print(h, 1); Serial.println(F(" %"));
}
