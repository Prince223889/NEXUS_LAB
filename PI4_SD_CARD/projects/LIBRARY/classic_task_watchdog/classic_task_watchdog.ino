// ESP32 LAB — Chien de garde (Task WDT) : redémarre la carte si le programme se bloque
// Tapez « bloque » dans le moniteur série pour simuler un blocage : reset au bout de 5 s.
#include <Arduino.h>
#include <esp_task_wdt.h>

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n# cause du dernier redémarrage : %d (7 = watchdog de tâche)\n", (int)esp_reset_reason());
  esp_task_wdt_config_t cfg = {};
  cfg.timeout_ms = 5000;
  cfg.idle_core_mask = 0;
  cfg.trigger_panic = true;
  if (esp_task_wdt_init(&cfg) == ESP_ERR_INVALID_STATE) esp_task_wdt_reconfigure(&cfg);   // déjà initialisé par le cœur
  esp_task_wdt_add(NULL);                     // surveille la tâche loop()
}

void loop() {
  esp_task_wdt_reset();                       // « je suis vivant »
  if (Serial.available() && Serial.readStringUntil('\n').indexOf("bloque") >= 0) {
    Serial.println(F("# boucle infinie volontaire…"));
    while (true) delay(10);
  }
  delay(100);
}
