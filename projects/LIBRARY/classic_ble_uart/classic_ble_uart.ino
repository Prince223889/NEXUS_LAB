// ESP32 LAB — Liaison série Bluetooth Low Energy (service UART Nordic) : compatible iPhone et Android
// App : « nRF Connect » ou « Bluefruit Connect » (onglet UART).
#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define RX_UUID "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define TX_UUID "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

BLECharacteristic *tx = nullptr;
bool connected = false;

class ServerCb : public BLEServerCallbacks {
  void onConnect(BLEServer *s) override { connected = true; Serial.println(F("# client connecté")); }
  void onDisconnect(BLEServer *s) override { connected = false; Serial.println(F("# client parti")); s->getAdvertising()->start(); }
};

class RxCb : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    String v = c->getValue();
    Serial.printf("# reçu : %s\n", v.c_str());
  }
};

void setup() {
  Serial.begin(115200);
  delay(300);
  BLEDevice::init("ESP32-LAB");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCb());
  BLEService *svc = server->createService(SERVICE_UUID);
  tx = svc->createCharacteristic(TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  tx->addDescriptor(new BLE2902());
  BLECharacteristic *rx = svc->createCharacteristic(RX_UUID, BLECharacteristic::PROPERTY_WRITE);
  rx->setCallbacks(new RxCb());
  svc->start();
  server->getAdvertising()->addServiceUUID(SERVICE_UUID);
  server->getAdvertising()->start();
  Serial.println(F("\n# BLE « ESP32-LAB » visible"));
}

void loop() {
  static uint32_t last = 0;
  if (connected && millis() - last > 2000) {
    last = millis();
    char msg[40];
    snprintf(msg, sizeof(msg), "temp=%.1f heap=%lu\n", temperatureRead(), (unsigned long)ESP.getFreeHeap());
    tx->setValue((uint8_t *)msg, strlen(msg));
    tx->notify();
  }
}
