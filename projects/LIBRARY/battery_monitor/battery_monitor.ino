// ==========================================================================
//  Niveau de batterie Li-ion (pont 100k/100k) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Tension et pourcentage estimé d'une cellule 18650 (3,0-4,2 V) via un pont diviseur par 2.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Niveau de batterie Li-ion (pont 100k/100k) VCC -> 3V3
//    Niveau de batterie Li-ion (pont 100k/100k) GND -> GND
//    Niveau de batterie Li-ion (pont 100k/100k) point milieu -> GPIO34   (100 kΩ vers la batterie +, 100 kΩ vers GND)
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_VBAT 34        // Niveau de batterie Li-ion (pont 100k/100k) point milieu

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 5000;   // Niveau de batterie Li-ion (pont 100k/100k) : période de mesure

// ---------- Mesures publiées ----------
float m1_volt = NAN;               // Niveau de batterie Li-ion (pont 100k/100k) — Tension (V)
float m1_pct = NAN;                // Niveau de batterie Li-ion (pont 100k/100k) — Charge estimée (%)

// ---------- Niveau de batterie Li-ion (pont 100k/100k) (batt) ----------

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("batt_volt", m1_volt, "V", false);
  lab_value("batt_pct", m1_pct, "%", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "niveau_de_batterie_l";
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
  Serial.println(F("\n# ESP32 LAB — Niveau de batterie Li-ion (pont 100k/100k) — mesure et affichage série"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Niveau de batterie Li-ion (pont 100k/100k) (batt) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    uint32_t s = 0;
    for (int i = 0; i < 32; i++) s += analogReadMilliVolts(M1_VBAT);
    float v = s / 32.0f * 2.0f / 1000.0f;
    m1_volt = v;
    static const float lut[11] = {3.00f, 3.45f, 3.68f, 3.74f, 3.77f, 3.79f, 3.82f, 3.87f, 3.92f, 3.98f, 4.20f};
    float pct = 0;
    for (int i = 10; i >= 0; i--) { if (v >= lut[i]) { pct = i * 10.0f; if (i < 10) pct += 10.0f * (v - lut[i]) / (lut[i + 1] - lut[i]); break; } }
    m1_pct = constrain(pct, 0.0f, 100.0f);
    lab_print_m1();
  }
}
