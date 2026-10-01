// ==========================================================================
//  Afficheur 7 segments 1 chiffre — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Afficheur à cathode commune piloté directement par 7 GPIO : compteur 0-9.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Afficheur 7 segments 1 chiffre VCC -> 3V3
//    Afficheur 7 segments 1 chiffre GND -> GND
//    Afficheur 7 segments 1 chiffre segment A (via 220 Ω) -> GPIO4
//    Afficheur 7 segments 1 chiffre segment B (via 220 Ω) -> GPIO13
//    Afficheur 7 segments 1 chiffre segment C (via 220 Ω) -> GPIO14
//    Afficheur 7 segments 1 chiffre segment D (via 220 Ω) -> GPIO16
//    Afficheur 7 segments 1 chiffre segment E (via 220 Ω) -> GPIO17
//    Afficheur 7 segments 1 chiffre segment F (via 220 Ω) -> GPIO25
//    Afficheur 7 segments 1 chiffre segment G (via 220 Ω) -> GPIO26
//    Afficheur 7 segments 1 chiffre COM -> GND (cathode commune)
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_SA 4          // Afficheur 7 segments 1 chiffre segment A (via 220 Ω)
#define M1_SB 13          // Afficheur 7 segments 1 chiffre segment B (via 220 Ω)
#define M1_SC 14          // Afficheur 7 segments 1 chiffre segment C (via 220 Ω)
#define M1_SD 16          // Afficheur 7 segments 1 chiffre segment D (via 220 Ω)
#define M1_SE 17          // Afficheur 7 segments 1 chiffre segment E (via 220 Ω)
#define M1_SF 25          // Afficheur 7 segments 1 chiffre segment F (via 220 Ω)
#define M1_SG 26          // Afficheur 7 segments 1 chiffre segment G (via 220 Ω)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // Afficheur 7 segments 1 chiffre : période de mesure

// ---------- Afficheur 7 segments 1 chiffre (seg1) ----------
const uint8_t m1_pins[7] = {M1_SA, M1_SB, M1_SC, M1_SD, M1_SE, M1_SF, M1_SG};
const uint8_t m1_digits[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F};
uint8_t m1_n = 0;

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "afficheur_7_segments";
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
  Serial.println(F("\n# ESP32 LAB — Afficheur 7 segments 1 chiffre — mesure et affichage série"));
  // Afficheur 7 segments 1 chiffre (seg1)
  for (int i = 0; i < 7; i++) pinMode(m1_pins[i], OUTPUT);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Afficheur 7 segments 1 chiffre (seg1) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    for (int i = 0; i < 7; i++) digitalWrite(m1_pins[i], (m1_digits[m1_n] >> i) & 1);
    m1_n = (m1_n + 1) % 10;
  }
}
