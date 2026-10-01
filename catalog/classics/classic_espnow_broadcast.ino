// ESP32 LAB — ESP-NOW en diffusion : chaque carte émet et reçoit (flashez-le sur 2 cartes ou plus)
#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>

uint8_t BROADCAST[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
uint32_t sent = 0, received = 0;

void onReceive(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  received++;
  Serial.printf("# reçu de %02X:%02X:%02X:%02X:%02X:%02X : %.*s (RSSI %d)\n", info->src_addr[0], info->src_addr[1],
                info->src_addr[2], info->src_addr[3], info->src_addr[4], info->src_addr[5], len, (const char *)data, info->rx_ctrl->rssi);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.mode(WIFI_STA);
  esp_now_init();
  esp_now_register_recv_cb(onReceive);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, BROADCAST, 6);
  esp_now_add_peer(&peer);
  Serial.printf("\n# %s prêt\n", WiFi.macAddress().c_str());
}

void loop() {
  char msg[48];
  int n = snprintf(msg, sizeof(msg), "salut n°%lu de %s", (unsigned long)++sent, WiFi.macAddress().c_str());
  esp_now_send(BROADCAST, (const uint8_t *)msg, n);
  Serial.printf("envoyes:%lu\trecus:%lu\n", (unsigned long)sent, (unsigned long)received);
  delay(3000 + (esp_random() % 1000));   // décalage aléatoire pour limiter les collisions
}
