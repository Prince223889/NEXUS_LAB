// ESP32 LAB — Test de la PSRAM (ESP32-S3 N8R8/N16R8, ESP32-WROVER) : taille, débit, intégrité
// IDE : Outils > PSRAM > « OPI PSRAM » pour les modules R8, « QSPI PSRAM » pour R2.
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(500);
  if (!psramFound()) {
    Serial.println(F("\n# aucune PSRAM détectée (option PSRAM de l'IDE ?)"));
    return;
  }
  size_t size = ESP.getFreePsram() / 2;
  Serial.printf("\n# PSRAM : %u Ko libres, test sur %u Ko\n", (unsigned)(ESP.getFreePsram() / 1024), (unsigned)(size / 1024));
  uint32_t *buf = (uint32_t *)ps_malloc(size);
  if (!buf) { Serial.println(F("# allocation impossible")); return; }
  size_t n = size / 4;
  uint32_t t0 = micros();
  for (size_t i = 0; i < n; i++) buf[i] = (uint32_t)i * 2654435761u;
  uint32_t tw = micros() - t0;
  t0 = micros();
  size_t errors = 0;
  for (size_t i = 0; i < n; i++) if (buf[i] != (uint32_t)i * 2654435761u) errors++;
  uint32_t tr = micros() - t0;
  Serial.printf("# écriture %.1f Mo/s, lecture %.1f Mo/s, erreurs %u\n", size / (float)tw, size / (float)tr, (unsigned)errors);
  free(buf);
}

void loop() {}
