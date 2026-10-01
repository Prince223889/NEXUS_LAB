// ==========================================================================
//  Station qualité de l'air complète
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  CO₂, COV, particules, température et humidité, enregistrés sur microSD et affichés sur OLED.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit SGP40 Sensor (1.1.4 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - Adafruit SSD1306 (2.5.17 ou plus récent) — Adafruit
//    - Adafruit GFX Library (1.12.6 ou plus récent) — Adafruit
//  Câblage :
//    SCD40 / SCD41 (CO₂ photoacoustique) VCC -> 3V3
//    SCD40 / SCD41 (CO₂ photoacoustique) GND -> GND
//    SCD40 / SCD41 (CO₂ photoacoustique) SDA -> GPIO21
//    SCD40 / SCD41 (CO₂ photoacoustique) SCL -> GPIO22
//    SGP40 (indice COV) VCC         -> 3V3
//    SGP40 (indice COV) GND         -> GND
//    SGP40 (indice COV) SDA         -> GPIO21
//    SGP40 (indice COV) SCL         -> GPIO22
//    PMS5003 / PMS7003 (particules fines) VCC -> 5V (VIN)
//    PMS5003 / PMS7003 (particules fines) GND -> GND
//    PMS5003 / PMS7003 (particules fines) TX du capteur -> GPIO16
//    PMS5003 / PMS7003 (particules fines) RX du capteur -> GPIO17
//    Écran OLED 0,96" SSD1306 128×64 (I2C) VCC -> 3V3
//    Écran OLED 0,96" SSD1306 128×64 (I2C) GND -> GND
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SDA -> GPIO21
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SCL -> GPIO22
//    Module carte microSD (SPI) VCC -> 3V3
//    Module carte microSD (SPI) GND -> GND
//    Module carte microSD (SPI) SCK -> GPIO18
//    Module carte microSD (SPI) MISO -> GPIO19
//    Module carte microSD (SPI) MOSI -> GPIO23
//    Module carte microSD (SPI) CS  -> GPIO4
//  Points d'attention :
//    ! Consommation de pointe estimée 688 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_SGP40.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
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
#define M3_RX 16          // PMS5003 / PMS7003 (particules fines) TX du capteur
#define M3_TX 17          // PMS5003 / PMS7003 (particules fines) RX du capteur
#define M5_CS 4          // Module carte microSD (SPI) CS

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 5000;   // SCD40 / SCD41 (CO₂ photoacoustique) : période de mesure
static const uint32_t M2_PERIOD_MS = 1000;   // SGP40 (indice COV) : période de mesure
static const uint32_t M3_PERIOD_MS = 1000;   // PMS5003 / PMS7003 (particules fines) : période de mesure
static const uint32_t M4_PERIOD_MS = 2000;   // Écran OLED 0,96" SSD1306 128×64 (I2C) : période de mesure
static const uint32_t M5_PERIOD_MS = 10000;   // Module carte microSD (SPI) : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "station_qualite_de_l";

// ---------- Mesures publiées ----------
float m1_co2 = NAN;                // SCD40 / SCD41 (CO₂ photoacoustique) — CO₂ (ppm)
float m1_temp = NAN;               // SCD40 / SCD41 (CO₂ photoacoustique) — Température (°C)
float m1_hum = NAN;                // SCD40 / SCD41 (CO₂ photoacoustique) — Humidité (%)
float m2_voc = NAN;                // SGP40 (indice COV) — Indice COV
float m2_raw = NAN;                // SGP40 (indice COV) — Brut
float m3_pm1 = NAN;                // PMS5003 / PMS7003 (particules fines) — PM1.0 (µg/m³)
float m3_pm25 = NAN;               // PMS5003 / PMS7003 (particules fines) — PM2.5 (µg/m³)
float m3_pm10 = NAN;               // PMS5003 / PMS7003 (particules fines) — PM10 (µg/m³)
float m5_count = NAN;              // Module carte microSD (SPI) — Lignes écrites
float m5_used = NAN;               // Module carte microSD (SPI) — Espace utilisé (Ko)

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"CO₂", "ppm", &m1_co2},
  {"Température", "°C", &m1_temp},
  {"Humidité", "%", &m1_hum},
  {"Indice COV", "", &m2_voc},
  {"Brut", "", &m2_raw},
  {"PM1.0", "µg/m³", &m3_pm1},
  {"PM2.5", "µg/m³", &m3_pm25},
  {"PM10", "µg/m³", &m3_pm10},
  {"Lignes écrites", "", &m5_count},
  {"Espace utilisé", "Ko", &m5_used}
};
const int LAB_OUT_COUNT = 10;

// ---------- Réseau ----------
WiFiUDP lab_udp;

// ---------- SCD40 / SCD41 (CO₂ photoacoustique) (scd40) ----------
bool m1_ok = false;
static const uint8_t m1_ADDR = 0x62;
bool m1_cmd(uint16_t c) {
  Wire.beginTransmission(m1_ADDR);
  Wire.write(c >> 8);
  Wire.write(c & 0xFF);
  return Wire.endTransmission() == 0;
}
uint8_t m1_crc(const uint8_t *d) {
  uint8_t crc = 0xFF;
  for (int i = 0; i < 2; i++) {
    crc ^= d[i];
    for (int b = 0; b < 8; b++) crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x31) : (uint8_t)(crc << 1);
  }
  return crc;
}

// ---------- SGP40 (indice COV) (sgp40) ----------
bool m2_ok = false;
Adafruit_SGP40 m2_sgp;

// ---------- PMS5003 / PMS7003 (particules fines) (pms) ----------
bool m3_ok = false;
uint8_t m3_buf[32];
uint8_t m3_pos = 0;

// ---------- Écran OLED 0,96" SSD1306 128×64 (I2C) (oled) ----------
bool m4_ok = false;
Adafruit_SSD1306 m4_d(128, 64, &Wire, -1);
String m4_ascii(const char *s) {
  String o;
  const uint8_t *p = (const uint8_t *)s;
  while (*p) {
    uint8_t c = *p++;
    if (c < 0x80) { o += (char)c; continue; }
    uint8_t d = *p ? *p++ : 0;
    if (c == 0xC2 && d == 0xB0) o += (char)248;                 // °
    else if ((c == 0xC2 && d == 0xB5) || (c == 0xCE && d == 0xBC)) o += 'u';   // µ
    else if (c == 0xC2 && d == 0xB2) o += '2';
    else if (c == 0xC2 && d == 0xB3) o += '3';
    else if (c == 0xC3) {
      if (d >= 0xA0 && d <= 0xA5) o += 'a'; else if (d == 0xA7) o += 'c'; else if (d >= 0xA8 && d <= 0xAB) o += 'e';
      else if (d >= 0xAC && d <= 0xAF) o += 'i'; else if (d >= 0xB2 && d <= 0xB6) o += 'o'; else if (d >= 0xB9 && d <= 0xBC) o += 'u';
      else if (d >= 0x80 && d <= 0x85) o += 'A'; else if (d == 0x87) o += 'C'; else if (d >= 0x88 && d <= 0x8B) o += 'E';
      else o += '?';
    } else if (c == 0xE2 && d == 0x82 && *p) { uint8_t e = *p++; o += (char)('0' + (e & 0x0F)); }   // ₀-₉
    else { while (*p && (*p & 0xC0) == 0x80) p++; o += '?'; }
  }
  return o;
}
String m4_line(int i) {
  char v[20];
  float x = lab_outs[i].value ? *lab_outs[i].value : NAN;
  if (isnan(x)) strcpy(v, "--");
  else if (fabsf(x) >= 1000) snprintf(v, sizeof(v), "%.0f", x);
  else snprintf(v, sizeof(v), "%.1f", x);
  return m4_ascii(lab_outs[i].label) + ": " + v + " " + m4_ascii(lab_outs[i].unit);
}

// ---------- Module carte microSD (SPI) (sd) ----------
bool m5_ok = false;
uint32_t m5_lines = 0;

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
  lab_value("scd40_co2", m1_co2, "ppm", false);
  lab_value("scd40_temp", m1_temp, "°C", false);
  lab_value("scd40_hum", m1_hum, "%", true);
}
void lab_print_m2() {
  lab_value("sgp40_voc", m2_voc, "", false);
  lab_value("sgp40_raw", m2_raw, "", true);
}
void lab_print_m3() {
  lab_value("pms_pm1", m3_pm1, "µg/m³", false);
  lab_value("pms_pm25", m3_pm25, "µg/m³", false);
  lab_value("pms_pm10", m3_pm10, "µg/m³", true);
}
void lab_print_m5() {
  lab_value("sd_count", m5_count, "", false);
  lab_value("sd_used", m5_used, "Ko", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "station_qualite_de_l";
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
  Serial.println(F("\n# ESP32 LAB — Station qualité de l'air complète"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // SCD40 / SCD41 (CO₂ photoacoustique) (scd40)
  m1_cmd(0x3F86);          // stop_periodic_measurement (au cas où)
  delay(500);
  m1_ok = m1_cmd(0x21B1);    // start_periodic_measurement (une mesure / 5 s)
  if (!m1_ok) Serial.println(F("# SCD40 / SCD41 (CO₂ photoacoustique) : non détecté — vérifiez le câblage et l'alimentation"));
  // SGP40 (indice COV) (sgp40)
  m2_ok = m2_sgp.begin(&Wire);
  if (!m2_ok) Serial.println(F("# SGP40 (indice COV) : non détecté — vérifiez le câblage et l'alimentation"));
  // PMS5003 / PMS7003 (particules fines) (pms)
  Serial2.begin(9600, SERIAL_8N1, M3_RX, M3_TX);
  m3_ok = true;
  if (!m3_ok) Serial.println(F("# PMS5003 / PMS7003 (particules fines) : non détecté — vérifiez le câblage et l'alimentation"));
  // Écran OLED 0,96" SSD1306 128×64 (I2C) (oled)
  m4_ok = m4_d.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (m4_ok) { m4_d.cp437(true); m4_d.clearDisplay(); m4_d.display(); }
  if (!m4_ok) Serial.println(F("# Écran OLED 0,96\" SSD1306 128×64 (I2C) : non détecté — vérifiez le câblage et l'alimentation"));
  // Module carte microSD (SPI) (sd)
  m5_ok = SD.begin(M5_CS);
  if (m5_ok) {
    Serial.printf("# carte SD : %llu Mo\n", SD.cardSize() / (1024ULL * 1024ULL));
    File f = SD.open("/journal.csv", FILE_APPEND);
    if (f) {
      f.print("millis");
      for (int i = 0; i < LAB_OUT_COUNT; i++) { f.print(';'); f.print(lab_outs[i].label); if (lab_outs[i].unit[0]) { f.print(" ("); f.print(lab_outs[i].unit); f.print(')'); } }
      f.println();
      f.close();
    }
  }
  if (!m5_ok) Serial.println(F("# Module carte microSD (SPI) : non détecté — vérifiez le câblage et l'alimentation"));
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
  // SCD40 / SCD41 (CO₂ photoacoustique) (scd40) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      if (m1_cmd(0xEC05)) {   // read_measurement
        delay(2);
        uint8_t b[9];
        if (Wire.requestFrom(m1_ADDR, (uint8_t)9) == 9) {
          for (int i = 0; i < 9; i++) b[i] = Wire.read();
          if (m1_crc(b) == b[2] && m1_crc(b + 3) == b[5] && m1_crc(b + 6) == b[8]) {
            uint16_t co2 = (b[0] << 8) | b[1];
            if (co2) {
              m1_co2 = co2;
              m1_temp = -45.0f + 175.0f * ((b[3] << 8) | b[4]) / 65535.0f;
              m1_hum = 100.0f * ((b[6] << 8) | b[7]) / 65535.0f;
            }
          }
        }
      }
      lab_print_m1();
    }
  }
  // SGP40 (indice COV) (sgp40) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    if (m2_ok) {
      m2_raw = m2_sgp.measureRaw();
      m2_voc = m2_sgp.measureVocIndex(25.0, 50.0);  // compensez avec T/RH réelles si disponibles
      lab_print_m2();
    }
  }
  // PMS5003 / PMS7003 (particules fines) (pms) — à chaque tour
  if (m3_ok) {
    while (Serial2.available()) {
      uint8_t c = Serial2.read();
      if ((m3_pos == 0 && c != 0x42) || (m3_pos == 1 && c != 0x4D)) { m3_pos = 0; continue; }
      m3_buf[m3_pos++] = c;
      if (m3_pos == 32) {
        m3_pos = 0;
        uint16_t sum = 0;
        for (int i = 0; i < 30; i++) sum += m3_buf[i];
        if (sum == (uint16_t)((m3_buf[30] << 8) | m3_buf[31])) {
          m3_pm1 = (m3_buf[10] << 8) | m3_buf[11];     // valeurs « atmosphériques »
          m3_pm25 = (m3_buf[12] << 8) | m3_buf[13];
          m3_pm10 = (m3_buf[14] << 8) | m3_buf[15];
        }
      }
    }
  }
  // PMS5003 / PMS7003 (particules fines) (pms) — toutes les M3_PERIOD_MS
  static uint32_t m3_last = 0;
  if (now - m3_last >= M3_PERIOD_MS) {
    m3_last = now;
    if (m3_ok) {
      lab_print_m3();
    }
  }
  // Écran OLED 0,96" SSD1306 128×64 (I2C) (oled) — toutes les M4_PERIOD_MS
  static uint32_t m4_last = 0;
  if (now - m4_last >= M4_PERIOD_MS) {
    m4_last = now;
    if (m4_ok) {
      m4_d.clearDisplay();
      m4_d.setTextSize(1);
      m4_d.setTextColor(SSD1306_WHITE);
      m4_d.setCursor(0, 0);
      m4_d.println(F("ESP32 LAB"));
      if (LAB_OUT_COUNT == 0) {
        m4_d.printf("Uptime %lus\n", (unsigned long)(millis() / 1000));
        m4_d.printf("RAM %luk\n", (unsigned long)(ESP.getFreeHeap() / 1024));
      } else {
        static int page = 0;
        const int per = 6;
        int pages = (LAB_OUT_COUNT + per - 1) / per;
        if (page >= pages) page = 0;
        for (int i = page * per; i < LAB_OUT_COUNT && i < (page + 1) * per; i++) m4_d.println(m4_line(i));
        page++;
      }
      m4_d.display();
    }
  }
  // Module carte microSD (SPI) (sd) — toutes les M5_PERIOD_MS
  static uint32_t m5_last = 0;
  if (now - m5_last >= M5_PERIOD_MS) {
    m5_last = now;
    if (m5_ok) {
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
        m5_lines++;
      }
      m5_count = m5_lines;
      m5_used = SD.usedBytes() / 1024.0f;
      lab_print_m5();
    }
  }
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
}
