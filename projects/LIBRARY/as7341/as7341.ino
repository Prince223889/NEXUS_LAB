// ==========================================================================
//  AS7341 (spectromètre 11 canaux) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Mini-spectromètre : 8 bandes visibles de 415 à 680 nm, proche IR et lumière claire.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit AS7341 (1.4.1 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//  Câblage :
//    AS7341 (spectromètre 11 canaux) VCC -> 3V3
//    AS7341 (spectromètre 11 canaux) GND -> GND
//    AS7341 (spectromètre 11 canaux) SDA -> GPIO21
//    AS7341 (spectromètre 11 canaux) SCL -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_AS7341.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1500;   // AS7341 (spectromètre 11 canaux) : période de mesure

// ---------- Mesures publiées ----------
float m1_f415 = NAN;               // AS7341 (spectromètre 11 canaux) — 415 nm (violet)
float m1_f480 = NAN;               // AS7341 (spectromètre 11 canaux) — 480 nm (bleu)
float m1_f555 = NAN;               // AS7341 (spectromètre 11 canaux) — 555 nm (vert)
float m1_f630 = NAN;               // AS7341 (spectromètre 11 canaux) — 630 nm (orange)
float m1_f680 = NAN;               // AS7341 (spectromètre 11 canaux) — 680 nm (rouge)
float m1_nir = NAN;                // AS7341 (spectromètre 11 canaux) — Proche IR

// ---------- AS7341 (spectromètre 11 canaux) (as7341) ----------
bool m1_ok = false;
Adafruit_AS7341 m1_as;

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("as7341_f415", m1_f415, "", false);
  lab_value("as7341_f480", m1_f480, "", false);
  lab_value("as7341_f555", m1_f555, "", false);
  lab_value("as7341_f630", m1_f630, "", false);
  lab_value("as7341_f680", m1_f680, "", false);
  lab_value("as7341_nir", m1_nir, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "as7341_spectrometre_";
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
  Serial.println(F("\n# ESP32 LAB — AS7341 (spectromètre 11 canaux) — mesure et affichage série"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // AS7341 (spectromètre 11 canaux) (as7341)
  m1_ok = m1_as.begin(AS7341_I2CADDR_DEFAULT, &Wire);
  if (m1_ok) { m1_as.setATIME(100); m1_as.setASTEP(999); m1_as.setGain(AS7341_GAIN_256X); }
  if (!m1_ok) Serial.println(F("# AS7341 (spectromètre 11 canaux) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // AS7341 (spectromètre 11 canaux) (as7341) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      if (m1_as.readAllChannels()) {
        m1_f415 = m1_as.getChannel(AS7341_CHANNEL_415nm_F1);
        m1_f480 = m1_as.getChannel(AS7341_CHANNEL_480nm_F3);
        m1_f555 = m1_as.getChannel(AS7341_CHANNEL_555nm_F5);
        m1_f630 = m1_as.getChannel(AS7341_CHANNEL_630nm_F7);
        m1_f680 = m1_as.getChannel(AS7341_CHANNEL_680nm_F8);
        m1_nir = m1_as.getChannel(AS7341_CHANNEL_NIR);
      }
      lab_print_m1();
    }
  }
}
