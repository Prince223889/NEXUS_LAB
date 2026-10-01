// ==========================================================================
//  Suivi d'une batterie / panneau solaire
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Tension, courant et puissance mesurés par INA219, enregistrés sur carte SD.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit INA219 (1.1.0 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - Adafruit SSD1306 (2.5.17 ou plus récent) — Adafruit
//    - Adafruit GFX Library (1.12.6 ou plus récent) — Adafruit
//  Câblage :
//    INA219 (tension/courant/puissance) VCC -> 3V3
//    INA219 (tension/courant/puissance) GND -> GND
//    INA219 (tension/courant/puissance) SDA -> GPIO21
//    INA219 (tension/courant/puissance) SCL -> GPIO22
//    Module carte microSD (SPI) VCC -> 3V3
//    Module carte microSD (SPI) GND -> GND
//    Module carte microSD (SPI) SCK -> GPIO18
//    Module carte microSD (SPI) MISO -> GPIO19
//    Module carte microSD (SPI) MOSI -> GPIO23
//    Module carte microSD (SPI) CS  -> GPIO4
//    Écran OLED 0,91" SSD1306 128×32 (I2C) VCC -> 3V3
//    Écran OLED 0,91" SSD1306 128×32 (I2C) GND -> GND
//    Écran OLED 0,91" SSD1306 128×32 (I2C) SDA -> GPIO21
//    Écran OLED 0,91" SSD1306 128×32 (I2C) SCL -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_INA219.h>
#include <SD.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
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
#define M2_CS 4          // Module carte microSD (SPI) CS

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // INA219 (tension/courant/puissance) : période de mesure
static const uint32_t M2_PERIOD_MS = 10000;   // Module carte microSD (SPI) : période de mesure
static const uint32_t M3_PERIOD_MS = 2000;   // Écran OLED 0,91" SSD1306 128×32 (I2C) : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "suivi_d_une_batterie";

// ---------- Mesures publiées ----------
float m1_volt = NAN;               // INA219 (tension/courant/puissance) — Tension (V)
float m1_curr = NAN;               // INA219 (tension/courant/puissance) — Courant (mA)
float m1_power = NAN;              // INA219 (tension/courant/puissance) — Puissance (mW)
float m2_count = NAN;              // Module carte microSD (SPI) — Lignes écrites
float m2_used = NAN;               // Module carte microSD (SPI) — Espace utilisé (Ko)

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Tension", "V", &m1_volt},
  {"Courant", "mA", &m1_curr},
  {"Puissance", "mW", &m1_power},
  {"Lignes écrites", "", &m2_count},
  {"Espace utilisé", "Ko", &m2_used}
};
const int LAB_OUT_COUNT = 5;

// ---------- Réseau ----------
WiFiUDP lab_udp;

// ---------- INA219 (tension/courant/puissance) (ina219) ----------
bool m1_ok = false;
Adafruit_INA219 m1_ina(0x40);

// ---------- Module carte microSD (SPI) (sd) ----------
bool m2_ok = false;
uint32_t m2_lines = 0;

// ---------- Écran OLED 0,91" SSD1306 128×32 (I2C) (oled32) ----------
bool m3_ok = false;
Adafruit_SSD1306 m3_d(128, 32, &Wire, -1);
String m3_ascii(const char *s) {
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
String m3_line(int i) {
  char v[20];
  float x = lab_outs[i].value ? *lab_outs[i].value : NAN;
  if (isnan(x)) strcpy(v, "--");
  else if (fabsf(x) >= 1000) snprintf(v, sizeof(v), "%.0f", x);
  else snprintf(v, sizeof(v), "%.1f", x);
  return m3_ascii(lab_outs[i].label) + ": " + v + " " + m3_ascii(lab_outs[i].unit);
}

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
  lab_value("ina219_volt", m1_volt, "V", false);
  lab_value("ina219_curr", m1_curr, "mA", false);
  lab_value("ina219_power", m1_power, "mW", true);
}
void lab_print_m2() {
  lab_value("sd_count", m2_count, "", false);
  lab_value("sd_used", m2_used, "Ko", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "suivi_d_une_batterie";
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
  Serial.println(F("\n# ESP32 LAB — Suivi d'une batterie / panneau solaire"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // INA219 (tension/courant/puissance) (ina219)
  m1_ok = m1_ina.begin(&Wire);
  if (m1_ok) m1_ina.setCalibration_32V_2A();
  if (!m1_ok) Serial.println(F("# INA219 (tension/courant/puissance) : non détecté — vérifiez le câblage et l'alimentation"));
  // Module carte microSD (SPI) (sd)
  m2_ok = SD.begin(M2_CS);
  if (m2_ok) {
    Serial.printf("# carte SD : %llu Mo\n", SD.cardSize() / (1024ULL * 1024ULL));
    File f = SD.open("/journal.csv", FILE_APPEND);
    if (f) {
      f.print("millis");
      for (int i = 0; i < LAB_OUT_COUNT; i++) { f.print(';'); f.print(lab_outs[i].label); if (lab_outs[i].unit[0]) { f.print(" ("); f.print(lab_outs[i].unit); f.print(')'); } }
      f.println();
      f.close();
    }
  }
  if (!m2_ok) Serial.println(F("# Module carte microSD (SPI) : non détecté — vérifiez le câblage et l'alimentation"));
  // Écran OLED 0,91" SSD1306 128×32 (I2C) (oled32)
  m3_ok = m3_d.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (m3_ok) { m3_d.cp437(true); m3_d.clearDisplay(); m3_d.display(); }
  if (!m3_ok) Serial.println(F("# Écran OLED 0,91\" SSD1306 128×32 (I2C) : non détecté — vérifiez le câblage et l'alimentation"));
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
  // INA219 (tension/courant/puissance) (ina219) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      m1_volt = m1_ina.getBusVoltage_V() + m1_ina.getShuntVoltage_mV() / 1000.0f;
      m1_curr = m1_ina.getCurrent_mA();
      m1_power = m1_ina.getPower_mW();
      lab_print_m1();
    }
  }
  // Module carte microSD (SPI) (sd) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    if (m2_ok) {
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
        m2_lines++;
      }
      m2_count = m2_lines;
      m2_used = SD.usedBytes() / 1024.0f;
      lab_print_m2();
    }
  }
  // Écran OLED 0,91" SSD1306 128×32 (I2C) (oled32) — toutes les M3_PERIOD_MS
  static uint32_t m3_last = 0;
  if (now - m3_last >= M3_PERIOD_MS) {
    m3_last = now;
    if (m3_ok) {
      m3_d.clearDisplay();
      m3_d.setTextSize(1);
      m3_d.setTextColor(SSD1306_WHITE);
      m3_d.setCursor(0, 0);
      m3_d.println(F("ESP32 LAB"));
      if (LAB_OUT_COUNT == 0) {
        m3_d.printf("Uptime %lus\n", (unsigned long)(millis() / 1000));
        m3_d.printf("RAM %luk\n", (unsigned long)(ESP.getFreeHeap() / 1024));
      } else {
        static int page = 0;
        const int per = 3;
        int pages = (LAB_OUT_COUNT + per - 1) / per;
        if (page >= pages) page = 0;
        for (int i = page * per; i < LAB_OUT_COUNT && i < (page + 1) * per; i++) m3_d.println(m3_line(i));
        page++;
      }
      m3_d.display();
    }
  }
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
}
