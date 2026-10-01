// ==========================================================================
//  Bus RS485 MAX485 (Modbus RTU) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Interroge un appareil Modbus RTU (compteur, variateur, sonde) : lecture de registres.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Bus RS485 MAX485 (Modbus RTU) VCC -> 5V (VIN)
//    Bus RS485 MAX485 (Modbus RTU) GND -> GND
//    Bus RS485 MAX485 (Modbus RTU) RO -> GPIO16
//    Bus RS485 MAX485 (Modbus RTU) DI -> GPIO17
//    Bus RS485 MAX485 (Modbus RTU) DE + RE (reliées) -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_RX 16          // Bus RS485 MAX485 (Modbus RTU) RO
#define M1_TX 17          // Bus RS485 MAX485 (Modbus RTU) DI
#define M1_DE 4          // Bus RS485 MAX485 (Modbus RTU) DE + RE (reliées)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 3000;   // Bus RS485 MAX485 (Modbus RTU) : période de mesure

// ---------- Mesures publiées ----------
float m1_value = NAN;              // Bus RS485 MAX485 (Modbus RTU) — Registre

// ---------- Bus RS485 MAX485 (Modbus RTU) (rs485) ----------
bool m1_ok = false;
uint16_t m1_crc(const uint8_t *b, int n) {
  uint16_t c = 0xFFFF;
  for (int i = 0; i < n; i++) {
    c ^= b[i];
    for (int k = 0; k < 8; k++) c = (c & 1) ? (c >> 1) ^ 0xA001 : c >> 1;
  }
  return c;
}
int32_t m1_readHolding(uint8_t slave, uint16_t reg) {
  uint8_t q[8] = {slave, 0x03, (uint8_t)(reg >> 8), (uint8_t)reg, 0, 1, 0, 0};
  uint16_t c = m1_crc(q, 6);
  q[6] = c & 0xFF; q[7] = c >> 8;
  while (Serial2.available()) Serial2.read();
  digitalWrite(M1_DE, HIGH);
  Serial2.write(q, 8);
  Serial2.flush();
  digitalWrite(M1_DE, LOW);
  uint8_t r[7];
  if (Serial2.readBytes(r, 7) != 7 || r[0] != slave || r[1] != 0x03) return -1;
  if (m1_crc(r, 5) != (uint16_t)(r[5] | (r[6] << 8))) return -2;
  return (r[3] << 8) | r[4];
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("rs485_value", m1_value, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "bus_rs485_max485_mod";
static char lab_home[17] = "";
static IPAddress lab_home_master(192, 168, 4, 1);
static WiFiUDP lab_home_udp;
static bool lab_home_udp_on = false;

static void lab_go_home() {
  const esp_partition_t *h = esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, lab_home);
  if (h && esp_ota_set_boot_partition(h) == ESP_OK) {
    Serial.println(F("# Retour au mode worker"));
    delay(200);
    ESP.restart();
  }
}

static void lab_home_begin() {
  Preferences p;
  if (!p.begin("lab", true)) return;
  String home = p.getString("home", ""), master = p.getString("master", "");
  String ssid = p.getString("ssid", ""), pass = p.getString("pass", "");
  p.end();
  const esp_partition_t *run = esp_ota_get_running_partition();
  if (home.isEmpty() || (run && home == run->label)) return;
  if (!esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, home.c_str())) return;
  strlcpy(lab_home, home.c_str(), sizeof(lab_home));
  lab_home_master.fromString(master);
#if LAB_BOOT_PIN >= 0
  pinMode(LAB_BOOT_PIN, INPUT_PULLUP);
#endif
  if (WiFi.getMode() == WIFI_OFF && !ssid.isEmpty()) {  // le projet n'utilise pas le Wi-Fi : on garde le lien avec le MASTER
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());
  }
  Serial.printf("# Projet chargé depuis ESP32 LAB : BOOT 3 s pour revenir au mode worker (%s)\n", lab_home);
}

static void lab_home_loop() {
  if (!lab_home[0]) return;
#if LAB_BOOT_PIN >= 0
  static uint32_t pressed = 0;
  if (digitalRead(LAB_BOOT_PIN) == LOW) {
    if (!pressed) pressed = millis() | 1;
    else if (millis() - pressed > 3000) lab_go_home();
  } else {
    pressed = 0;
  }
#endif
  if (WiFi.status() != WL_CONNECTED) { lab_home_udp_on = false; return; }
  if (!lab_home_udp_on) { lab_home_udp.begin(4215); lab_home_udp_on = true; }
  static uint32_t beat = 0;
  if (millis() - beat > 4000) {  // le MASTER voit ce worker « en projet » et peut le rappeler
    beat = millis();
    lab_home_udp.beginPacket(lab_home_master, 4211);
    lab_home_udp.printf("APP|%s|%s|%s", WiFi.macAddress().c_str(), LAB_PROJECT, WiFi.localIP().toString().c_str());
    lab_home_udp.endPacket();
  }
  if (lab_home_udp.parsePacket() > 0) {
    char b[16] = {0};
    lab_home_udp.read(b, sizeof(b) - 1);
    if (!strncmp(b, "LAB|HOME", 8)) lab_go_home();
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println(F("\n# ESP32 LAB — Bus RS485 MAX485 (Modbus RTU) — mesure et affichage série"));
  // Bus RS485 MAX485 (Modbus RTU) (rs485)
  pinMode(M1_DE, OUTPUT);
  digitalWrite(M1_DE, LOW);
  Serial2.begin(9600, SERIAL_8N1, M1_RX, M1_TX);
  Serial2.setTimeout(200);
  m1_ok = true;
  if (!m1_ok) Serial.println(F("# Bus RS485 MAX485 (Modbus RTU) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Bus RS485 MAX485 (Modbus RTU) (rs485) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      int32_t v = m1_readHolding(1, 0);
      if (v >= 0) m1_value = v;
      else Serial.printf("# Modbus : pas de réponse (%ld)\n", (long)v);
      lab_print_m1();
    }
  }
}
