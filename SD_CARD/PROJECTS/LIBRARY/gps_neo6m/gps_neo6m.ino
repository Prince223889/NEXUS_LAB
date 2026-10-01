// ==========================================================================
//  GPS u-blox NEO-6M / NEO-M8N — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Position, altitude, vitesse, heure UTC et nombre de satellites (trames NMEA 9600 bauds).
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - TinyGPSPlus (1.0.3 ou plus récent) — Mikal Hart
//  Câblage :
//    GPS u-blox NEO-6M / NEO-M8N VCC -> 3V3
//    GPS u-blox NEO-6M / NEO-M8N GND -> GND
//    GPS u-blox NEO-6M / NEO-M8N TX du GPS -> GPIO16
//    GPS u-blox NEO-6M / NEO-M8N RX du GPS -> GPIO17
// ==========================================================================
#include <Arduino.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_RX 16          // GPS u-blox NEO-6M / NEO-M8N TX du GPS
#define M1_TX 17          // GPS u-blox NEO-6M / NEO-M8N RX du GPS

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // GPS u-blox NEO-6M / NEO-M8N : période de mesure

// ---------- Mesures publiées ----------
float m1_lat = NAN;                // GPS u-blox NEO-6M / NEO-M8N — Latitude (°)
float m1_lng = NAN;                // GPS u-blox NEO-6M / NEO-M8N — Longitude (°)
float m1_alt = NAN;                // GPS u-blox NEO-6M / NEO-M8N — Altitude (m)
float m1_speed = NAN;              // GPS u-blox NEO-6M / NEO-M8N — Vitesse (km/h)
float m1_sats = NAN;               // GPS u-blox NEO-6M / NEO-M8N — Satellites

// ---------- GPS u-blox NEO-6M / NEO-M8N (gps) ----------
TinyGPSPlus m1_gps;

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("gps_lat", m1_lat, "°", false);
  lab_value("gps_lng", m1_lng, "°", false);
  lab_value("gps_alt", m1_alt, "m", false);
  lab_value("gps_speed", m1_speed, "km/h", false);
  lab_value("gps_sats", m1_sats, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "gps_u_blox_neo_6m_ne";
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
  Serial.println(F("\n# ESP32 LAB — GPS u-blox NEO-6M / NEO-M8N — mesure et affichage série"));
  // GPS u-blox NEO-6M / NEO-M8N (gps)
  Serial2.begin(9600, SERIAL_8N1, M1_RX, M1_TX);
  Serial.println(F("# GPS : premier fix en extérieur, 30 s à plusieurs minutes"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // GPS u-blox NEO-6M / NEO-M8N (gps) — à chaque tour
  while (Serial2.available()) m1_gps.encode(Serial2.read());
  // GPS u-blox NEO-6M / NEO-M8N (gps) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_sats = m1_gps.satellites.isValid() ? m1_gps.satellites.value() : 0;
    if (m1_gps.location.isValid()) {
      m1_lat = m1_gps.location.lat();
      m1_lng = m1_gps.location.lng();
      Serial.printf("# position : %.6f, %.6f  https://maps.google.com/?q=%.6f,%.6f\n", m1_gps.location.lat(), m1_gps.location.lng(), m1_gps.location.lat(), m1_gps.location.lng());
    }
    if (m1_gps.altitude.isValid()) m1_alt = m1_gps.altitude.meters();
    if (m1_gps.speed.isValid()) m1_speed = m1_gps.speed.kmph();
    if (m1_gps.time.isValid()) Serial.printf("# heure UTC %02d:%02d:%02d\n", m1_gps.time.hour(), m1_gps.time.minute(), m1_gps.time.second());
    if (millis() > 10000 && m1_gps.charsProcessed() < 10) Serial.println(F("# aucune donnée GPS : vérifiez TX/RX et 9600 bauds"));
    lab_print_m1();
  }
}
