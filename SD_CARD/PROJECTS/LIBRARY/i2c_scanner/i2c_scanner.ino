// ==========================================================================
//  Scanner I2C (diagnostic) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Liste les adresses I2C présentes sur le bus et identifie les puces courantes.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Scanner I2C (diagnostic) VCC   -> 3V3
//    Scanner I2C (diagnostic) GND   -> GND
//    Scanner I2C (diagnostic) SDA   -> GPIO21
//    Scanner I2C (diagnostic) SCL   -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 5000;   // Scanner I2C (diagnostic) : période de mesure

// ---------- Mesures publiées ----------
float m1_count = NAN;              // Scanner I2C (diagnostic) — Périphériques

// ---------- Scanner I2C (diagnostic) (scan) ----------
const char *m1_guess(uint8_t a) {
  switch (a) {
    case 0x23: return "BH1750"; case 0x27: case 0x3F: return "LCD I2C (PCF8574)";
    case 0x29: return "VL53L0X / TCS34725 / TSL2591"; case 0x38: return "AHT10/20"; case 0x3C: case 0x3D: return "OLED SSD1306/SH1106";
    case 0x40: return "INA219 / HTU21D / PCA9685 / Si7021"; case 0x44: case 0x45: return "SHT3x / SHT4x";
    case 0x48: return "ADS1115 / TMP102 / LM75"; case 0x50: case 0x57: return "EEPROM AT24Cxx"; case 0x53: return "ADXL345 / ENS160";
    case 0x5A: return "MLX90614 / CCS811 / MPR121"; case 0x60: return "MCP4725 / Si1145";
    case 0x62: return "SCD40"; case 0x68: return "MPU6050 / DS3231 / DS1307"; case 0x69: return "MPU6050 (AD0) / AMG8833";
    case 0x76: case 0x77: return "BME280 / BMP280 / BME680 / MS5611";
    default: return "";
  }
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("scan_count", m1_count, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "scanner_i2c_diagnost";
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
  Serial.println(F("\n# ESP32 LAB — Scanner I2C (diagnostic) — mesure et affichage série"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Scanner I2C (diagnostic) (scan) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    int n = 0;
    for (uint8_t a = 1; a < 127; a++) {
      Wire.beginTransmission(a);
      if (Wire.endTransmission() == 0) { Serial.printf("# 0x%02X %s\n", a, m1_guess(a)); n++; }
    }
    Serial.printf("# %d périphérique(s)\n", n);
    m1_count = n;
    lab_print_m1();
  }
}
