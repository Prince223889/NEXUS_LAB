/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  GPS NEO-6M
 * =====================================================================
 *  Explication : Affiche latitude, longitude et nombre de satellites reçus par le GPS.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> GPS VCC
 *   Arduino GND    -> GPS GND
 *   Arduino D4     -> GPS TX
 *   Arduino D3     -> GPS RX
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : TinyGPSPlus
 * =====================================================================
 */
// @libs: TinyGPSPlus

#include <SoftwareSerial.h>
#include <TinyGPSPlus.h>

// RX Arduino = D4 (vers TX du GPS), TX Arduino = D3 (vers RX du GPS)
SoftwareSerial gpsSerial(4, 3);
TinyGPSPlus gps;

void setup() {
  Serial.begin(9600);
  gpsSerial.begin(9600);
  Serial.println(F("[63] GPS NEO-6M pret (attendre le fix en exterieur)"));
}

void loop() {
  // Transmet chaque caractère reçu au décodeur NMEA
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  // Affichage à chaque nouvelle position
  if (gps.location.isUpdated()) {
    Serial.print(F("Lat: ")); Serial.print(gps.location.lat(), 6);
    Serial.print(F("  Lon: ")); Serial.print(gps.location.lng(), 6);
    Serial.print(F("  Sat: ")); Serial.println(gps.satellites.value());
  }
}
