// ==========================================================================
//  Capteur distant LoRa (plusieurs km)
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Envoie température, humidité et pression par radio LoRa toutes les 10 s.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit BME280 Library (2.3.0 ou plus récent) — Adafruit
//    - Adafruit Unified Sensor (1.1.15 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - LoRa (0.8.0 ou plus récent) — Sandeep Mistry
//  Câblage :
//    BME280 VCC                     -> 3V3
//    BME280 GND                     -> GND
//    BME280 SDA                     -> GPIO21
//    BME280 SCL                     -> GPIO22
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) VCC -> 3V3
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) GND -> GND
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) SCK -> GPIO18
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) MISO -> GPIO19
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) MOSI -> GPIO23
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) NSS -> GPIO4
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) RST -> GPIO13
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) DIO0 -> GPIO34
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_BME280.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define LAB_SPI_SCK 18
#define LAB_SPI_MISO 19
#define LAB_SPI_MOSI 23
#define M2_NSS 4         // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) NSS
#define M2_RST 13         // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) RST
#define M2_DIO0 34        // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) DIO0

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // BME280 : période de mesure
static const uint32_t M2_PERIOD_MS = 10000;   // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) : période de mesure

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // BME280 — Température (°C)
float m1_hum = NAN;                // BME280 — Humidité (%)
float m1_press = NAN;              // BME280 — Pression (hPa)
float m1_alt = NAN;                // BME280 — Altitude (m)
float m2_sent = NAN;               // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) — Paquets envoyés
float m2_rssi = NAN;               // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) — RSSI dernier reçu (dBm)

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Température", "°C", &m1_temp},
  {"Humidité", "%", &m1_hum},
  {"Pression", "hPa", &m1_press},
  {"Altitude", "m", &m1_alt},
  {"Paquets envoyés", "", &m2_sent},
  {"RSSI dernier reçu", "dBm", &m2_rssi}
};
const int LAB_OUT_COUNT = 6;

// ---------- BME280 (bme280) ----------
bool m1_ok = false;
Adafruit_BME280 m1_bme;

// ---------- LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora) ----------
bool m2_ok = false;
uint32_t m2_n = 0;

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("bme280_temp", m1_temp, "°C", false);
  lab_value("bme280_hum", m1_hum, "%", false);
  lab_value("bme280_press", m1_press, "hPa", false);
  lab_value("bme280_alt", m1_alt, "m", true);
}
void lab_print_m2() {
  lab_value("lora_sent", m2_sent, "", false);
  lab_value("lora_rssi", m2_rssi, "dBm", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "capteur_distant_lora";
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
  Serial.println(F("\n# ESP32 LAB — Capteur distant LoRa (plusieurs km)"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // BME280 (bme280)
  m1_ok = m1_bme.begin(0x76, &Wire);
  if (!m1_ok) Serial.println(F("# BME280 : non détecté — vérifiez le câblage et l'alimentation"));
  // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora)
  LoRa.setPins(M2_NSS, M2_RST, M2_DIO0);
  m2_ok = LoRa.begin(868E6);
  if (m2_ok) { LoRa.setSpreadingFactor(9); LoRa.setSyncWord(0x4C); }
  if (!m2_ok) Serial.println(F("# LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // BME280 (bme280) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      m1_temp = m1_bme.readTemperature();
      m1_hum = m1_bme.readHumidity();
      m1_press = m1_bme.readPressure() / 100.0f;
      m1_alt = m1_bme.readAltitude(1013.25);
      lab_print_m1();
    }
  }
  // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora) — à chaque tour
  if (m2_ok) {
    int size = LoRa.parsePacket();
    if (size) {
      String msg;
      while (LoRa.available()) msg += (char)LoRa.read();
      Serial.printf("# LoRa reçu (%d dBm) : %s\n", LoRa.packetRssi(), msg.c_str());
      m2_rssi = LoRa.packetRssi();
    }
  }
  // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    if (m2_ok) {
      LoRa.beginPacket();
      LoRa.printf("LAB;%lu", (unsigned long)++m2_n);
      for (int i = 0; i < LAB_OUT_COUNT; i++) {                 // toutes les mesures du projet
        float v = lab_outs[i].value ? *lab_outs[i].value : NAN;
        if (!isnan(v) && lab_outs[i].value != &m2_sent && lab_outs[i].value != &m2_rssi) LoRa.printf(";%s=%.2f", lab_outs[i].label, v);
      }
      LoRa.endPacket();
      m2_sent = m2_n;
      lab_print_m2();
    }
  }
}
