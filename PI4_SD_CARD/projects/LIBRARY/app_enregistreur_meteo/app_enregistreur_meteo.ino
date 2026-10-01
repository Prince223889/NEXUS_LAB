// ==========================================================================
//  Enregistreur de données climatiques
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Température, humidité et pression journalisées toutes les 10 s dans un CSV lisible par Excel.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit BME280 Library (2.3.0 ou plus récent) — Adafruit
//    - Adafruit Unified Sensor (1.1.15 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - RTClib (2.1.4 ou plus récent) — Adafruit
//  Câblage :
//    BME280 VCC                     -> 3V3
//    BME280 GND                     -> GND
//    BME280 SDA                     -> GPIO21
//    BME280 SCL                     -> GPIO22
//    Horloge temps réel DS3231 VCC  -> 3V3
//    Horloge temps réel DS3231 GND  -> GND
//    Horloge temps réel DS3231 SDA  -> GPIO21
//    Horloge temps réel DS3231 SCL  -> GPIO22
//    Module carte microSD (SPI) VCC -> 3V3
//    Module carte microSD (SPI) GND -> GND
//    Module carte microSD (SPI) SCK -> GPIO18
//    Module carte microSD (SPI) MISO -> GPIO19
//    Module carte microSD (SPI) MOSI -> GPIO23
//    Module carte microSD (SPI) CS  -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_BME280.h>
#include <RTClib.h>
#include <SD.h>
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
#define M3_CS 4          // Module carte microSD (SPI) CS

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // BME280 : période de mesure
static const uint32_t M2_PERIOD_MS = 1000;   // Horloge temps réel DS3231 : période de mesure
static const uint32_t M3_PERIOD_MS = 10000;   // Module carte microSD (SPI) : période de mesure

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // BME280 — Température (°C)
float m1_hum = NAN;                // BME280 — Humidité (%)
float m1_press = NAN;              // BME280 — Pression (hPa)
float m1_alt = NAN;                // BME280 — Altitude (m)
float m2_epoch = NAN;              // Horloge temps réel DS3231 — Secondes depuis minuit (s)
float m2_temp = NAN;               // Horloge temps réel DS3231 — Température puce (°C)
float m3_count = NAN;              // Module carte microSD (SPI) — Lignes écrites
float m3_used = NAN;               // Module carte microSD (SPI) — Espace utilisé (Ko)

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Température", "°C", &m1_temp},
  {"Humidité", "%", &m1_hum},
  {"Pression", "hPa", &m1_press},
  {"Altitude", "m", &m1_alt},
  {"Secondes depuis minuit", "s", &m2_epoch},
  {"Température puce", "°C", &m2_temp},
  {"Lignes écrites", "", &m3_count},
  {"Espace utilisé", "Ko", &m3_used}
};
const int LAB_OUT_COUNT = 8;

// ---------- BME280 (bme280) ----------
bool m1_ok = false;
Adafruit_BME280 m1_bme;

// ---------- Horloge temps réel DS3231 (ds3231) ----------
bool m2_ok = false;
RTC_DS3231 m2_rtc;

// ---------- Module carte microSD (SPI) (sd) ----------
bool m3_ok = false;
uint32_t m3_lines = 0;

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
  lab_value("ds3231_epoch", m2_epoch, "s", false);
  lab_value("ds3231_temp", m2_temp, "°C", true);
}
void lab_print_m3() {
  lab_value("sd_count", m3_count, "", false);
  lab_value("sd_used", m3_used, "Ko", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "enregistreur_de_donn";
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
  Serial.println(F("\n# ESP32 LAB — Enregistreur de données climatiques"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // BME280 (bme280)
  m1_ok = m1_bme.begin(0x76, &Wire);
  if (!m1_ok) Serial.println(F("# BME280 : non détecté — vérifiez le câblage et l'alimentation"));
  // Horloge temps réel DS3231 (ds3231)
  m2_ok = m2_rtc.begin(&Wire);
  if (m2_ok && m2_rtc.lostPower()) {
    Serial.println(F("# RTC : heure perdue, réglage sur l'heure de compilation"));
    m2_rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
  if (!m2_ok) Serial.println(F("# Horloge temps réel DS3231 : non détecté — vérifiez le câblage et l'alimentation"));
  // Module carte microSD (SPI) (sd)
  m3_ok = SD.begin(M3_CS);
  if (m3_ok) {
    Serial.printf("# carte SD : %llu Mo\n", SD.cardSize() / (1024ULL * 1024ULL));
    File f = SD.open("/journal.csv", FILE_APPEND);
    if (f) {
      f.print("millis");
      for (int i = 0; i < LAB_OUT_COUNT; i++) { f.print(';'); f.print(lab_outs[i].label); if (lab_outs[i].unit[0]) { f.print(" ("); f.print(lab_outs[i].unit); f.print(')'); } }
      f.println();
      f.close();
    }
  }
  if (!m3_ok) Serial.println(F("# Module carte microSD (SPI) : non détecté — vérifiez le câblage et l'alimentation"));
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
  // Horloge temps réel DS3231 (ds3231) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    if (m2_ok) {
      DateTime n = m2_rtc.now();
      Serial.printf("# %02d/%02d/%04d %02d:%02d:%02d\n", n.day(), n.month(), n.year(), n.hour(), n.minute(), n.second());
      m2_epoch = n.unixtime() % 86400UL;
      m2_temp = m2_rtc.getTemperature();
      lab_print_m2();
    }
  }
  // Module carte microSD (SPI) (sd) — toutes les M3_PERIOD_MS
  static uint32_t m3_last = 0;
  if (now - m3_last >= M3_PERIOD_MS) {
    m3_last = now;
    if (m3_ok) {
      File f = SD.open("/journal.csv", FILE_APPEND);
      if (f) {
        f.print(millis());
        for (int i = 0; i < LAB_OUT_COUNT; i++) {
          float v = lab_outs[i].value ? *lab_outs[i].value : NAN;
          f.print(';');
          if (!isnan(v)) f.print(v, 3);
        }
        f.println();
        f.close();
        m3_lines++;
      }
      m3_count = m3_lines;
      m3_used = SD.usedBytes() / 1024.0f;
      lab_print_m3();
    }
  }
}
