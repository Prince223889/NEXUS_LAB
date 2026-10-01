// ==========================================================================
//  INMP441 (micro numérique I2S) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Microphone MEMS numérique 24 bits : niveau sonore RMS, base pour reconnaissance audio.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    INMP441 (micro numérique I2S) VCC -> 3V3
//    INMP441 (micro numérique I2S) GND -> GND
//    INMP441 (micro numérique I2S) SCK -> GPIO4
//    INMP441 (micro numérique I2S) WS -> GPIO13
//    INMP441 (micro numérique I2S) SD -> GPIO34
//    INMP441 (micro numérique I2S) L/R -> GND   (canal gauche)
// ==========================================================================
#include <Arduino.h>
#include <ESP_I2S.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_SCK 4         // INMP441 (micro numérique I2S) SCK
#define M1_WS 13          // INMP441 (micro numérique I2S) WS
#define M1_SD 34          // INMP441 (micro numérique I2S) SD

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 100;   // INMP441 (micro numérique I2S) : période de mesure

// ---------- Mesures publiées ----------
float m1_dbfs = NAN;               // INMP441 (micro numérique I2S) — Niveau RMS (dBFS)

// ---------- INMP441 (micro numérique I2S) (inmp441) ----------
bool m1_ok = false;
I2SClass m1_i2s;

// ---------- Publication (moniteur / traceur série, réseau) ----------
bool lab_changed(float v, float &prev) {
  const bool same = (v == prev) || (isnan(v) && isnan(prev));
  prev = v;
  return !same;
}
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("inmp441_dbfs", m1_dbfs, "dBFS", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "inmp441_micro_numeri";
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
  Serial.println(F("\n# ESP32 LAB — INMP441 (micro numérique I2S) — mesure et affichage série"));
  // INMP441 (micro numérique I2S) (inmp441)
  m1_i2s.setPins(M1_SCK, M1_WS, -1, M1_SD);
  m1_ok = m1_i2s.begin(I2S_MODE_STD, 16000, I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO, I2S_STD_SLOT_LEFT);
  if (!m1_ok) Serial.println(F("# INMP441 (micro numérique I2S) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // INMP441 (micro numérique I2S) (inmp441) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      int32_t buf[256];
      size_t n = m1_i2s.readBytes((char *)buf, sizeof(buf)) / sizeof(int32_t);
      double sum = 0;
      for (size_t i = 0; i < n; i++) { double s = (buf[i] >> 8) / 8388608.0; sum += s * s; }
      if (n) m1_dbfs = 20.0f * log10(sqrt(sum / n) + 1e-9);
      static float m1_prev[1];
      static uint32_t m1_printed = 0;
      bool m1_ch = false;
      m1_ch |= lab_changed(m1_dbfs, m1_prev[0]);
      if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
    }
  }
}
