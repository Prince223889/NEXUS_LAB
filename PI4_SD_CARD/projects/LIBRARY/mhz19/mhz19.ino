// ==========================================================================
//  MH-Z19B / MH-Z19C (CO₂ NDIR) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Capteur CO₂ infrarouge Winsen 0-5000 ppm, liaison série 9600 bauds.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    MH-Z19B / MH-Z19C (CO₂ NDIR) VCC -> 5V (VIN)
//    MH-Z19B / MH-Z19C (CO₂ NDIR) GND -> GND
//    MH-Z19B / MH-Z19C (CO₂ NDIR) TX du capteur -> GPIO16   (TX du MH-Z19 → RX de l'ESP32)
//    MH-Z19B / MH-Z19C (CO₂ NDIR) RX du capteur -> GPIO17
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_RX 16          // MH-Z19B / MH-Z19C (CO₂ NDIR) TX du capteur
#define M1_TX 17          // MH-Z19B / MH-Z19C (CO₂ NDIR) RX du capteur

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 5000;   // MH-Z19B / MH-Z19C (CO₂ NDIR) : période de mesure

// ---------- Mesures publiées ----------
float m1_co2 = NAN;                // MH-Z19B / MH-Z19C (CO₂ NDIR) — CO₂ (ppm)
float m1_temp = NAN;               // MH-Z19B / MH-Z19C (CO₂ NDIR) — Température interne (°C)

// ---------- MH-Z19B / MH-Z19C (CO₂ NDIR) (mhz19) ----------
bool m1_ok = false;
bool m1_read(uint16_t &ppm, int &temp) {
  static const uint8_t cmd[9] = {0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79};
  while (Serial2.available()) Serial2.read();
  Serial2.write(cmd, 9);
  uint8_t r[9];
  if (Serial2.readBytes(r, 9) != 9 || r[0] != 0xFF || r[1] != 0x86) return false;
  uint8_t sum = 0;
  for (int i = 1; i < 8; i++) sum += r[i];
  if ((uint8_t)(0xFF - sum + 1) != r[8]) return false;
  ppm = (r[2] << 8) | r[3];
  temp = (int)r[4] - 40;
  return true;
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("mhz19_co2", m1_co2, "ppm", false);
  lab_value("mhz19_temp", m1_temp, "°C", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "mh_z19b_mh_z19c_co_n";
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
  Serial.println(F("\n# ESP32 LAB — MH-Z19B / MH-Z19C (CO₂ NDIR) — mesure et affichage série"));
  // MH-Z19B / MH-Z19C (CO₂ NDIR) (mhz19)
  Serial2.begin(9600, SERIAL_8N1, M1_RX, M1_TX);
  Serial2.setTimeout(200);
  m1_ok = true;
  if (!m1_ok) Serial.println(F("# MH-Z19B / MH-Z19C (CO₂ NDIR) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // MH-Z19B / MH-Z19C (CO₂ NDIR) (mhz19) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      uint16_t ppm; int t;
      if (m1_read(ppm, t)) { m1_co2 = ppm; m1_temp = t; }
      lab_print_m1();
    }
  }
}
