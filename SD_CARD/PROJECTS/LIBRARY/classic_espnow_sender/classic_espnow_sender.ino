// ESP32 LAB — ESP-NOW émetteur : envoi direct de carte à carte, sans box Wi-Fi (portée ~200 m)
// Renseignez l'adresse MAC du récepteur (affichée par classic_espnow_receiver).
#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>

uint8_t RECEIVER_MAC[6] = {0x24, 0x6F, 0x28, 0x00, 0x00, 0x00};   // à remplacer

typedef struct {
  uint32_t counter;
  float value;
  char text[32];
} message_t;

message_t msg;

void onSent(const esp_now_send_info_t *info, esp_now_send_status_t status) {
  (void)info;
  Serial.printf("# envoi %lu : %s\n", (unsigned long)msg.counter, status == ESP_NOW_SEND_SUCCESS ? "reçu" : "échec");
}

void setup() {
  Serial.begin(115200);
  delay(300);
  WiFi.mode(WIFI_STA);
  if (esp_now_init() != ESP_OK) { Serial.println(F("# esp_now_init a échoué")); return; }
  esp_now_register_send_cb(onSent);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, RECEIVER_MAC, 6);
  peer.channel = 0;
  peer.encrypt = false;
  if (esp_now_add_peer(&peer) != ESP_OK) Serial.println(F("# ajout du pair impossible"));
}

void loop() {
  msg.counter++;
  msg.value = temperatureRead();
  snprintf(msg.text, sizeof(msg.text), "bonjour %lu", (unsigned long)msg.counter);
  esp_now_send(RECEIVER_MAC, (const uint8_t *)&msg, sizeof(msg));
  delay(2000);
}
