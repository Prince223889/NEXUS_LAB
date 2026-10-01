// ==========================================================================
//  Capteur connecté au tableau de bord du MASTER
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Rejoint le Wi-Fi « ESP32-LAB » et envoie ses mesures au MASTER (onglet Capteurs).
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit SHT4x Library (1.0.5 ou plus récent) — Adafruit
//    - Adafruit Unified Sensor (1.1.15 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - BH1750 (1.3.0 ou plus récent) — Christopher Laws
//  Câblage :
//    SHT40 / SHT41 / SHT45 VCC      -> 3V3
//    SHT40 / SHT41 / SHT45 GND      -> GND
//    SHT40 / SHT41 / SHT45 SDA      -> GPIO21
//    SHT40 / SHT41 / SHT45 SCL      -> GPIO22
//    BH1750 (GY-30 / GY-302) VCC    -> 3V3
//    BH1750 (GY-30 / GY-302) GND    -> GND
//    BH1750 (GY-30 / GY-302) SDA    -> GPIO21
//    BH1750 (GY-30 / GY-302) SCL    -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <BH1750.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // SHT40 / SHT41 / SHT45 : période de mesure
static const uint32_t M2_PERIOD_MS = 1000;   // BH1750 (GY-30 / GY-302) : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "capteur_connecte_au_";

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // SHT40 / SHT41 / SHT45 — Température (°C)
float m1_hum = NAN;                // SHT40 / SHT41 / SHT45 — Humidité (%)
float m2_lux = NAN;                // BH1750 (GY-30 / GY-302) — Éclairement (lx)

// ---------- Réseau ----------
WiFiUDP lab_udp;

// ---------- SHT40 / SHT41 / SHT45 (sht4x) ----------
bool m1_ok = false;
Adafruit_SHT4x m1_sht;

// ---------- BH1750 (GY-30 / GY-302) (bh1750) ----------
bool m2_ok = false;
BH1750 m2_meter(0x23);

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_send_master(const char *key, float v, const char *unit) {
  if (WiFi.status() != WL_CONNECTED || isnan(v)) return;
  lab_udp.beginPacket(IPAddress(192, 168, 4, 1), 4213);
  lab_udp.printf("LAB|%s|%s|%.3f|%s\n", LAB_DEVICE, key, v, unit);
  lab_udp.endPacket();
}
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  lab_send_master(key, v, unit);
}
void lab_print_m1() {
  lab_value("sht4x_temp", m1_temp, "°C", false);
  lab_value("sht4x_hum", m1_hum, "%", true);
}
void lab_print_m2() {
  lab_value("bh1750_lux", m2_lux, "lx", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "capteur_connecte_au_";
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
  Serial.println(F("\n# ESP32 LAB — Capteur connecté au tableau de bord du MASTER"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // SHT40 / SHT41 / SHT45 (sht4x)
  m1_ok = m1_sht.begin(&Wire);
  if (m1_ok) { m1_sht.setPrecision(SHT4X_HIGH_PRECISION); m1_sht.setHeater(SHT4X_NO_HEATER); }
  if (!m1_ok) Serial.println(F("# SHT40 / SHT41 / SHT45 : non détecté — vérifiez le câblage et l'alimentation"));
  // BH1750 (GY-30 / GY-302) (bh1750)
  m2_ok = m2_meter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire);
  if (!m2_ok) Serial.println(F("# BH1750 (GY-30 / GY-302) : non détecté — vérifiez le câblage et l'alimentation"));
  // Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(LAB_WIFI_SSID, LAB_WIFI_PASS);
  Serial.print(F("# Wi-Fi"));
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(250); Serial.print("."); }
  if (WiFi.status() == WL_CONNECTED) Serial.printf("\n# Connecté : http://%s/\n", WiFi.localIP().toString().c_str());
  else Serial.println(F("\n# Wi-Fi indisponible : nouvelle tentative automatique"));
  lab_udp.begin(4214);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // SHT40 / SHT41 / SHT45 (sht4x) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      sensors_event_t h, t;
      if (m1_sht.getEvent(&h, &t)) { m1_temp = t.temperature; m1_hum = h.relative_humidity; }
      lab_print_m1();
    }
  }
  // BH1750 (GY-30 / GY-302) (bh1750) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    if (m2_ok) {
      float lx = m2_meter.readLightLevel();
      m2_lux = lx < 0 ? NAN : lx;
      lab_print_m2();
    }
  }
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
}
