/*
 * =====================================================================
 *  Arduino Lab Nexus v6.1.0 STABLE  -  DS18B20 OneWire
 * =====================================================================
 *  Explication : Sonde de température étanche DS18B20 sur bus OneWire.
 *  Carte       : Arduino UNO / Nano (ATmega328P) - compatible Mega
 *  Moniteur    : 9600 bauds
 *
 *  Câblage :
 *   Arduino 5V     -> DS18B20 VDD (rouge)
 *   Arduino D2     -> DS18B20 DATA (jaune) + 4.7k vers 5V
 *   Arduino GND    -> DS18B20 GND (noir)
 *
 *  Bibliothèques requises (arduino-cli lib install "...") : OneWire, DallasTemperature
 * =====================================================================
 */
// @libs: OneWire|DallasTemperature

#include <OneWire.h>
#include <DallasTemperature.h>

#define PIN_ONEWIRE 2
OneWire oneWire(PIN_ONEWIRE);
DallasTemperature sondes(&oneWire);

void setup() {
  Serial.begin(9600);
  sondes.begin();
  Serial.print(F("[10] Sondes trouvees: "));
  Serial.println(sondes.getDeviceCount());
}

void loop() {
  sondes.requestTemperatures();
  float t = sondes.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C) Serial.println(F("Sonde deconnectee"));
  else { Serial.print(F("Temperature: ")); Serial.print(t, 2); Serial.println(F(" C")); }
  delay(1000);
}
