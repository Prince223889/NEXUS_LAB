// ESP32 LAB — Carte d'identité de la puce : modèle, cœurs, flash, PSRAM, adresses MAC, partitions
#include <Arduino.h>
#include <esp_chip_info.h>
#include <esp_mac.h>
#include <esp_partition.h>

void setup() {
  Serial.begin(115200);
  delay(500);
  esp_chip_info_t info;
  esp_chip_info(&info);
  Serial.printf("\n# Puce        : %s rév. %d, %d cœur(s) à %lu MHz\n", ESP.getChipModel(), ESP.getChipRevision(), info.cores, (unsigned long)ESP.getCpuFreqMHz());
  Serial.printf("# Fonctions   : %s%s%s%s\n", info.features & CHIP_FEATURE_WIFI_BGN ? "Wi-Fi " : "", info.features & CHIP_FEATURE_BT ? "BT " : "",
                info.features & CHIP_FEATURE_BLE ? "BLE " : "", info.features & CHIP_FEATURE_IEEE802154 ? "802.15.4 " : "");
  Serial.printf("# Flash       : %lu Mo à %lu MHz\n", (unsigned long)(ESP.getFlashChipSize() >> 20), (unsigned long)(ESP.getFlashChipSpeed() / 1000000));
  Serial.printf("# PSRAM       : %lu Ko\n", (unsigned long)(ESP.getPsramSize() >> 10));
  Serial.printf("# Croquis     : %lu Ko utilisés, %lu Ko libres pour l'OTA\n", (unsigned long)(ESP.getSketchSize() >> 10), (unsigned long)(ESP.getFreeSketchSpace() >> 10));
  Serial.printf("# Cœur Arduino: %s, ESP-IDF %s\n", ESP.getCoreVersion(), ESP.getSdkVersion());
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  Serial.printf("# MAC Wi-Fi   : %02X:%02X:%02X:%02X:%02X:%02X\n", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.println(F("# Partitions  :"));
  esp_partition_iterator_t it = esp_partition_find(ESP_PARTITION_TYPE_ANY, ESP_PARTITION_SUBTYPE_ANY, NULL);
  for (; it; it = esp_partition_next(it)) {
    const esp_partition_t *p = esp_partition_get(it);
    Serial.printf("#   %-10s type %d/%-3d  0x%06lX  %5lu Ko\n", p->label, p->type, p->subtype, (unsigned long)p->address, (unsigned long)(p->size >> 10));
  }
  esp_partition_iterator_release(it);
}

void loop() {}
