// ==========================================================================
//  Lecteur NFC PN532 (I2C) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Lecteur NFC polyvalent : badges MIFARE, NTAG, et même certains smartphones.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit PN532 (1.3.4 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//  Câblage :
//    Lecteur NFC PN532 (I2C) VCC    -> 3V3
//    Lecteur NFC PN532 (I2C) GND    -> GND
//    Lecteur NFC PN532 (I2C) SDA    -> GPIO21
//    Lecteur NFC PN532 (I2C) SCL    -> GPIO22
//    Lecteur NFC PN532 (I2C) IRQ    -> GPIO34
//    Lecteur NFC PN532 (I2C) RSTO   -> GPIO4
//    Lecteur NFC PN532 (I2C) interrupteurs -> I2C : SW1 = ON, SW2 = OFF   (mode I2C du module rouge)
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M1_IRQ 34         // Lecteur NFC PN532 (I2C) IRQ
#define M1_RST 4         // Lecteur NFC PN532 (I2C) RSTO

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 500;   // Lecteur NFC PN532 (I2C) : période de mesure

// ---------- Mesures publiées ----------
float m1_reads = NAN;              // Lecteur NFC PN532 (I2C) — Lectures

// ---------- Lecteur NFC PN532 (I2C) (nfc) ----------
bool m1_ok = false;
Adafruit_PN532 m1_nfc(M1_IRQ, M1_RST, &Wire);
uint32_t m1_n = 0;

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
  lab_value("nfc_reads", m1_reads, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "lecteur_nfc_pn532_i2";
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
  Serial.println(F("\n# ESP32 LAB — Lecteur NFC PN532 (I2C) — mesure et affichage série"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // Lecteur NFC PN532 (I2C) (nfc)
  m1_ok = m1_nfc.begin();
  if (m1_ok) {
    uint32_t v = m1_nfc.getFirmwareVersion();
    m1_ok = v != 0;
    if (m1_ok) { Serial.printf("# PN532 firmware %lu.%lu\n", (unsigned long)((v >> 16) & 0xFF), (unsigned long)((v >> 8) & 0xFF)); m1_nfc.SAMConfig(); }
  }
  if (!m1_ok) Serial.println(F("# Lecteur NFC PN532 (I2C) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Lecteur NFC PN532 (I2C) (nfc) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      uint8_t uid[7], len = 0;
      if (m1_nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &len, 50)) {
        Serial.print(F("# carte NFC : "));
        for (uint8_t i = 0; i < len; i++) Serial.printf("%02X ", uid[i]);
        Serial.println();
        m1_reads = ++m1_n;
      }
      static float m1_prev[1];
      static uint32_t m1_printed = 0;
      bool m1_ch = false;
      m1_ch |= lab_changed(m1_reads, m1_prev[0]);
      if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
    }
  }
}
