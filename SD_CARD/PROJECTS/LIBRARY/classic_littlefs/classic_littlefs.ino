// ESP32 LAB — Système de fichiers LittleFS dans la flash : écrire, relire, lister
#include <Arduino.h>
#include <LittleFS.h>

void listDir(const char *path) {
  File root = LittleFS.open(path);
  for (File f = root.openNextFile(); f; f = root.openNextFile())
    Serial.printf("#   %-24s %6u octets\n", f.name(), (unsigned)f.size());
}

void setup() {
  Serial.begin(115200);
  delay(300);
  if (!LittleFS.begin(true)) {               // true = formate au premier usage
    Serial.println(F("# LittleFS indisponible (schéma de partition sans SPIFFS ?)"));
    return;
  }
  File f = LittleFS.open("/journal.txt", FILE_APPEND);
  f.printf("démarrage à %lu ms, RAM libre %lu\n", (unsigned long)millis(), (unsigned long)ESP.getFreeHeap());
  f.close();
  Serial.println(F("\n# contenu de /journal.txt :"));
  f = LittleFS.open("/journal.txt");
  while (f.available()) Serial.write(f.read());
  f.close();
  Serial.println(F("# fichiers :"));
  listDir("/");
  Serial.printf("# utilisé %u / %u octets\n", (unsigned)LittleFS.usedBytes(), (unsigned)LittleFS.totalBytes());
}

void loop() {}
