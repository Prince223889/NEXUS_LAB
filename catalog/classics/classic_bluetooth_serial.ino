// ESP32 LAB — Bluetooth classique (SPP) : terminal série sans fil avec un smartphone Android
// ESP32 d'origine uniquement (les S3/C3 n'ont que le BLE). App : « Serial Bluetooth Terminal ».
#include <Arduino.h>
#include "BluetoothSerial.h"

BluetoothSerial bt;

void setup() {
  Serial.begin(115200);
  delay(300);
  bt.begin("ESP32-LAB-BT");
  Serial.println(F("\n# appairez « ESP32-LAB-BT » depuis le téléphone"));
}

void loop() {
  while (bt.available()) Serial.write(bt.read());
  while (Serial.available()) bt.write(Serial.read());
  static uint32_t last = 0;
  if (bt.hasClient() && millis() - last > 5000) {
    last = millis();
    bt.printf("uptime %lu s\r\n", (unsigned long)(millis() / 1000));
  }
}
