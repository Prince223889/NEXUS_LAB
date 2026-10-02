/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  Thermomètre IR MLX90614
 * =====================================================================
 *  Explication : Mesure sans contact la température d'un objet et la température ambiante.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> MLX90614 VIN
 *   Arduino GND    -> MLX90614 GND
 *   Arduino A4     -> MLX90614 SDA
 *   Arduino A5     -> MLX90614 SCL
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : Adafruit MLX90614 Library, Adafruit BusIO
 * =====================================================================
 */
// @libs: Adafruit MLX90614 Library|Adafruit BusIO

#include <Wire.h>
#include <Adafruit_MLX90614.h>

Adafruit_MLX90614 mlx;

void setup() {
  Serial.begin(9600);
  if (!mlx.begin()) {
    Serial.println(F("MLX90614 introuvable"));
    while (1) {}
  }
  Serial.println(F("[68] MLX90614 pret"));
}

void loop() {
  Serial.print(F("Ambiante: "));
  Serial.print(mlx.readAmbientTempC(), 1);
  Serial.print(F(" C  Objet: "));
  Serial.print(mlx.readObjectTempC(), 1);
  Serial.println(F(" C"));
  delay(500);
}
