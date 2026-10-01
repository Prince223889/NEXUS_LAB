// ESP32 LAB — Sommeil profond minuté : ~10 µA entre deux mesures (idéal sur batterie)
#include <Arduino.h>

RTC_DATA_ATTR uint32_t bootCount = 0;      // conservé pendant le deep sleep (mémoire RTC)
const uint64_t SLEEP_SECONDS = 20;

void setup() {
  Serial.begin(115200);
  delay(300);
  bootCount++;
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  Serial.printf("\n# réveil n°%lu, cause : %s\n", (unsigned long)bootCount,
                cause == ESP_SLEEP_WAKEUP_TIMER ? "minuterie" : "mise sous tension / reset");
  // … faire la mesure ici (capteur, envoi réseau) …
  Serial.printf("# température interne : %.1f °C\n", temperatureRead());
  Serial.printf("# sommeil profond pendant %llu s\n", SLEEP_SECONDS);
  Serial.flush();
  esp_sleep_enable_timer_wakeup(SLEEP_SECONDS * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // jamais atteint : l'ESP32 redémarre à chaque réveil
}
