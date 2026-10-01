/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  SHT31 Température/Humidité
 * =====================================================================
 *  Explication : Lit la température et l'humidité d'un SHT31 de précision en I2C.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 3.3V   -> SHT31 VCC
 *   Arduino GND    -> SHT31 GND
 *   Arduino A4     -> SHT31 SDA
 *   Arduino A5     -> SHT31 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit SHT31 Library, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit SHT31 Library|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_SHT31.h>

// Objet capteur
Adafruit_SHT31 sht31 = Adafruit_SHT31();

void setup() {
  Serial.begin(9600);
  // Adresse 0x44 (ou 0x45 selon le module)
  if (!sht31.begin(0x44)) {
    Serial.println(F("SHT31 introuvable, verifier le cablage"));
    while (true) {}
  }
  Serial.println(F("[26] SHT31 pret"));
}

void loop() {
  float t = sht31.readTemperature();
  float h = sht31.readHumidity();
  // Vérifie que la lecture est valide
  if (isnan(t) || isnan(h)) {
    Serial.println(F("Erreur de lecture SHT31"));
  } else {
    Serial.print(F("Temperature: ")); Serial.print(t, 2); Serial.print(F(" C  "));
    Serial.print(F("Humidite: "));    Serial.print(h, 1); Serial.println(F(" %"));
  }
  delay(1000);
}
