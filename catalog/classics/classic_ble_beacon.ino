// ESP32 LAB — Balise iBeacon : un téléphone mesure sa distance à la balise (app « Beacon Scanner »)
#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEBeacon.h>
#include <BLEAdvertising.h>

void setup() {
  Serial.begin(115200);
  delay(300);
  BLEDevice::init("ESP32-LAB-BEACON");
  BLEBeacon beacon;
  beacon.setManufacturerId(0x4C00);                         // format Apple iBeacon
  beacon.setProximityUUID(BLEUUID("e2c56db5-dffb-48d2-b060-d0f5a71096e0"));
  beacon.setMajor(1);
  beacon.setMinor(42);
  beacon.setSignalPower(-59);                               // RSSI attendu à 1 m
  BLEAdvertisementData adv;
  adv.setFlags(0x04);
  String payload;
  payload += (char)26;                                      // longueur
  payload += (char)0xFF;                                    // données constructeur
  payload += beacon.getData();
  adv.addData(payload);
  BLEAdvertising *a = BLEDevice::getAdvertising();
  a->setAdvertisementData(adv);
  a->start();
  Serial.println(F("\n# iBeacon émis (major 1, minor 42)"));
}

void loop() {
  delay(1000);
}
