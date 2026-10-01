// ESP32 LAB — Sommeil profond réveillé par un bouton (broche RTC) : télécommande, sonnette sur pile
#include <Arduino.h>
#include "driver/rtc_io.h"

#if CONFIG_IDF_TARGET_ESP32
const gpio_num_t WAKE_PIN = GPIO_NUM_33;     // broche RTC de l'ESP32
#else
const gpio_num_t WAKE_PIN = GPIO_NUM_4;      // ESP32-S3 : GPIO 0 à 21 sont RTC
#endif
RTC_DATA_ATTR uint32_t presses = 0;

void setup() {
  Serial.begin(115200);
  delay(300);
  if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_EXT0) presses++;
  Serial.printf("\n# appuis cumulés : %lu — bouton entre GPIO%d et GND\n", (unsigned long)presses, (int)WAKE_PIN);
  rtc_gpio_pullup_en(WAKE_PIN);               // tirage interne maintenu pendant le sommeil
  rtc_gpio_pulldown_dis(WAKE_PIN);
  esp_sleep_enable_ext0_wakeup(WAKE_PIN, 0);  // réveil sur niveau bas
  Serial.println(F("# dodo…"));
  Serial.flush();
  delay(200);
  esp_deep_sleep_start();
}

void loop() {}
