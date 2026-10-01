// ESP32 LAB — ESP-NOW récepteur : affiche son adresse MAC puis les messages reçus
#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>

typedef struct {
  uint32_t counter;
  float value;
  char text[32];
} message_t;

void onReceive(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len != sizeof(message_t)) return;
  message_t m;
  memcpy(&m, data, sizeof(m));
  const uint8_t *s = info->src_addr;
  Serial.printf("# de %02X:%02X:%02X:%02X:%02X:%02X  n°%lu  valeur %.2f  « %s »  RSSI %d dBm\n",
                s[0], s[1], s[2], s[3], s[4], s[5], (unsigned long)m.counter, m.value, m.text, info->rx_ctrl->rssi);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.mode(WIFI_STA);
  Serial.printf("\n# MAC de ce récepteur : %s\n", WiFi.macAddress().c_str());
  if (esp_now_init() != ESP_OK) { Serial.println(F("# esp_now_init a échoué")); return; }
  esp_now_register_recv_cb(onReceive);
}

void loop() {
  delay(1000);
}
