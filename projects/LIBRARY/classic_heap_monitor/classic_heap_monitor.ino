// ESP32 LAB — Moniteur mémoire : RAM, PSRAM, fragmentation, pile — détecte les fuites mémoire
#include <Arduino.h>
#include <esp_heap_caps.h>

void setup() {
  Serial.begin(115200);
  delay(300);
}

void loop() {
  size_t freeHeap = ESP.getFreeHeap();
  size_t minHeap = ESP.getMinFreeHeap();
  size_t largest = heap_caps_get_largest_free_block(MALLOC_CAP_8BIT);
  float frag = freeHeap ? 100.0f * (1.0f - (float)largest / freeHeap) : 0;
  Serial.printf("heap_ko:%.1f\theap_min_ko:%.1f\tbloc_max_ko:%.1f\tfragmentation:%.1f\tpsram_ko:%.1f\tpile_libre:%u\n",
                freeHeap / 1024.0f, minHeap / 1024.0f, largest / 1024.0f, frag, ESP.getFreePsram() / 1024.0f,
                (unsigned)uxTaskGetStackHighWaterMark(NULL));
  delay(2000);
}
