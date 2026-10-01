// ==========================================================================
//  Afficheur 8 chiffres MAX7219 — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Barrette 8 chiffres 7 segments : affiche la première mesure avec une décimale.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Afficheur 8 chiffres MAX7219 VCC -> 5V (VIN)
//    Afficheur 8 chiffres MAX7219 GND -> GND
//    Afficheur 8 chiffres MAX7219 DIN -> GPIO4
//    Afficheur 8 chiffres MAX7219 CS -> GPIO13
//    Afficheur 8 chiffres MAX7219 CLK -> GPIO14
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_DIN 4         // Afficheur 8 chiffres MAX7219 DIN
#define M1_CS 13          // Afficheur 8 chiffres MAX7219 CS
#define M1_CLK 14         // Afficheur 8 chiffres MAX7219 CLK

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 500;   // Afficheur 8 chiffres MAX7219 : période de mesure

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[1] = {{"", "", nullptr}};
const int LAB_OUT_COUNT = 0;

// ---------- Afficheur 8 chiffres MAX7219 (seg8) ----------
void m1_send(uint8_t reg, uint8_t val) {
  digitalWrite(M1_CS, LOW);
  shiftOut(M1_DIN, M1_CLK, MSBFIRST, reg);
  shiftOut(M1_DIN, M1_CLK, MSBFIRST, val);
  digitalWrite(M1_CS, HIGH);
}

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
static const char *LAB_PROJECT = "afficheur_8_chiffres";
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
  Serial.println(F("\n# ESP32 LAB — Afficheur 8 chiffres MAX7219 — mesure et affichage série"));
  // Afficheur 8 chiffres MAX7219 (seg8)
  pinMode(M1_DIN, OUTPUT); pinMode(M1_CS, OUTPUT); pinMode(M1_CLK, OUTPUT);
  digitalWrite(M1_CS, HIGH);
  m1_send(0x0F, 0); m1_send(0x09, 0xFF); m1_send(0x0B, 7); m1_send(0x0A, 5); m1_send(0x0C, 1);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Afficheur 8 chiffres MAX7219 (seg8) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    long n;
    bool dp = false;
    if (LAB_OUT_COUNT > 0 && lab_outs[0].value && !isnan(*lab_outs[0].value)) { n = lroundf(*lab_outs[0].value * 10); dp = true; }
    else n = millis() / 1000;
    bool neg = n < 0;
    n = labs(n);
    for (uint8_t d = 1; d <= 8; d++) {
      uint8_t v = (n == 0 && d > (dp ? 2 : 1)) ? 0x0F : n % 10;          // 0x0F = blanc
      if (neg && n == 0 && d > (dp ? 2 : 1)) { v = 0x0A; neg = false; }    // 0x0A = signe moins
      if (dp && d == 2) v |= 0x80;
      m1_send(d, v);
      n /= 10;
    }
  }
}
