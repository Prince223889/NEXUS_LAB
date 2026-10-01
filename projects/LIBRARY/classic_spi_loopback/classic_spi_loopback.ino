// ESP32 LAB — Test de boucle SPI : reliez MOSI à MISO ; chaque octet envoyé doit revenir identique
#include <Arduino.h>
#include <SPI.h>

void setup() {
  Serial.begin(115200);
  delay(300);
  SPI.begin();                                // broches SPI par défaut de la carte
  Serial.printf("\n# pont MOSI (GPIO%d) -> MISO (GPIO%d) requis\n", MOSI, MISO);
}

void loop() {
  static uint32_t errors = 0, total = 0;
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  for (int i = 0; i < 256; i++) {
    uint8_t r = SPI.transfer((uint8_t)i);
    if (r != (uint8_t)i) errors++;
    total++;
  }
  SPI.endTransaction();
  Serial.printf("octets:%lu\terreurs:%lu\n", (unsigned long)total, (unsigned long)errors);
  delay(1000);
}
