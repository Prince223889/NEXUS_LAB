// ESP32 LAB — Multitâche FreeRTOS : deux tâches, une file de messages, un mutex, les deux cœurs
#include <Arduino.h>

QueueHandle_t queue;
SemaphoreHandle_t serialMutex;

#if CONFIG_FREERTOS_UNICORE
#define CORE_A 0
#define CORE_B 0
#else
#define CORE_A 0
#define CORE_B 1
#endif

void logLine(const char *fmt, uint32_t v) {
  xSemaphoreTake(serialMutex, portMAX_DELAY);  // un seul accès à la fois au port série
  Serial.printf(fmt, (unsigned long)v, xPortGetCoreID());
  xSemaphoreGive(serialMutex);
}

void producer(void *arg) {
  uint32_t n = 0;
  for (;;) {
    n++;
    xQueueSend(queue, &n, portMAX_DELAY);
    logLine("# producteur : %lu envoyé (cœur %d)\n", n);
    vTaskDelay(pdMS_TO_TICKS(700));
  }
}

void consumer(void *arg) {
  uint32_t v;
  for (;;) {
    if (xQueueReceive(queue, &v, portMAX_DELAY) == pdTRUE) logLine("# consommateur : %lu reçu (cœur %d)\n", v);
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  queue = xQueueCreate(8, sizeof(uint32_t));
  serialMutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(producer, "producteur", 3072, NULL, 2, NULL, CORE_A);
  xTaskCreatePinnedToCore(consumer, "consommateur", 3072, NULL, 2, NULL, CORE_B);
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(5000));
  logLine("# loop() : %lu tâches actives (cœur %d)\n", uxTaskGetNumberOfTasks());
}
