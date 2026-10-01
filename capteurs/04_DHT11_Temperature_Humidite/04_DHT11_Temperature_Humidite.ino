/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  DHT11 / DHT22
 * =====================================================================
 *  Explication : Mesure température et humidité avec un capteur DHT11 (ou DHT22).
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> DHT VCC
 *   Arduino D2     -> DHT DATA (+ pull-up 10k si capteur nu)
 *   Arduino GND    -> DHT GND
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : DHT sensor library, Adafruit Unified Sensor
 * =====================================================================
 */
// @libs: DHT sensor library|Adafruit Unified Sensor

#include <DHT.h>

#define PIN_DHT  2
#define TYPE_DHT DHT11          // remplacer par DHT22 si besoin

DHT dht(PIN_DHT, TYPE_DHT);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println(F("[04] DHT pret"));
}

void loop() {
  delay(2000);                           // le DHT11 ne supporte pas plus de 1 lecture / s
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println(F("Erreur de lecture DHT (verifier cablage)"));
    return;
  }
  Serial.print(F("Temperature: ")); Serial.print(t, 1); Serial.print(F(" C   "));
  Serial.print(F("Humidite: "));    Serial.print(h, 0); Serial.println(F(" %"));
}
