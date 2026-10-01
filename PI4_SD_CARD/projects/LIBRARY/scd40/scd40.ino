// ==========================================================================
//  SCD40 / SCD41 (CO₂ photoacoustique) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Capteur CO₂ miniature Sensirion (400-5000 ppm), piloté directement par commandes I2C.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    SCD40 / SCD41 (CO₂ photoacoustique) VCC -> 3V3
//    SCD40 / SCD41 (CO₂ photoacoustique) GND -> GND
//    SCD40 / SCD41 (CO₂ photoacoustique) SDA -> GPIO21
//    SCD40 / SCD41 (CO₂ photoacoustique) SCL -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 5000;   // SCD40 / SCD41 (CO₂ photoacoustique) : période de mesure

// ---------- Mesures publiées ----------
float m1_co2 = NAN;                // SCD40 / SCD41 (CO₂ photoacoustique) — CO₂ (ppm)
float m1_temp = NAN;               // SCD40 / SCD41 (CO₂ photoacoustique) — Température (°C)
float m1_hum = NAN;                // SCD40 / SCD41 (CO₂ photoacoustique) — Humidité (%)

// ---------- SCD40 / SCD41 (CO₂ photoacoustique) (scd40) ----------
bool m1_ok = false;
static const uint8_t m1_ADDR = 0x62;
bool m1_cmd(uint16_t c) {
  Wire.beginTransmission(m1_ADDR);
  Wire.write(c >> 8);
  Wire.write(c & 0xFF);
  return Wire.endTransmission() == 0;
}
uint8_t m1_crc(const uint8_t *d) {
  uint8_t crc = 0xFF;
  for (int i = 0; i < 2; i++) {
    crc ^= d[i];
    for (int b = 0; b < 8; b++) crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x31) : (uint8_t)(crc << 1);
  }
  return crc;
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("scd40_co2", m1_co2, "ppm", false);
  lab_value("scd40_temp", m1_temp, "°C", false);
  lab_value("scd40_hum", m1_hum, "%", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "scd40_scd41_co_photo";
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
  Serial.println(F("\n# ESP32 LAB — SCD40 / SCD41 (CO₂ photoacoustique) — mesure et affichage série"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // SCD40 / SCD41 (CO₂ photoacoustique) (scd40)
  m1_cmd(0x3F86);          // stop_periodic_measurement (au cas où)
  delay(500);
  m1_ok = m1_cmd(0x21B1);    // start_periodic_measurement (une mesure / 5 s)
  if (!m1_ok) Serial.println(F("# SCD40 / SCD41 (CO₂ photoacoustique) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // SCD40 / SCD41 (CO₂ photoacoustique) (scd40) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      if (m1_cmd(0xEC05)) {   // read_measurement
        delay(2);
        uint8_t b[9];
        if (Wire.requestFrom(m1_ADDR, (uint8_t)9) == 9) {
          for (int i = 0; i < 9; i++) b[i] = Wire.read();
          if (m1_crc(b) == b[2] && m1_crc(b + 3) == b[5] && m1_crc(b + 6) == b[8]) {
            uint16_t co2 = (b[0] << 8) | b[1];
            if (co2) {
              m1_co2 = co2;
              m1_temp = -45.0f + 175.0f * ((b[3] << 8) | b[4]) / 65535.0f;
              m1_hum = 100.0f * ((b[6] << 8) | b[7]) / 65535.0f;
            }
          }
        }
      }
      lab_print_m1();
    }
  }
}
