// ==========================================================================
//  MPU-6050 (GY-521) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Centrale inertielle 6 axes : accéléromètre ±2-16 g et gyroscope ±250-2000 °/s.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit MPU6050 (2.2.9 ou plus récent) — Adafruit
//    - Adafruit Unified Sensor (1.1.15 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//  Câblage :
//    MPU-6050 (GY-521) VCC          -> 3V3
//    MPU-6050 (GY-521) GND          -> GND
//    MPU-6050 (GY-521) SDA          -> GPIO21
//    MPU-6050 (GY-521) SCL          -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 100;   // MPU-6050 (GY-521) : période de mesure

// ---------- Mesures publiées ----------
float m1_ax = NAN;                 // MPU-6050 (GY-521) — Accél. X (m/s²)
float m1_ay = NAN;                 // MPU-6050 (GY-521) — Accél. Y (m/s²)
float m1_az = NAN;                 // MPU-6050 (GY-521) — Accél. Z (m/s²)
float m1_gx = NAN;                 // MPU-6050 (GY-521) — Gyro X (°/s)
float m1_gy = NAN;                 // MPU-6050 (GY-521) — Gyro Y (°/s)
float m1_gz = NAN;                 // MPU-6050 (GY-521) — Gyro Z (°/s)
float m1_roll = NAN;               // MPU-6050 (GY-521) — Roulis (°)
float m1_pitch = NAN;              // MPU-6050 (GY-521) — Tangage (°)

// ---------- MPU-6050 (GY-521) (mpu6050) ----------
bool m1_ok = false;
Adafruit_MPU6050 m1_mpu;

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
  lab_value("mpu6050_ax", m1_ax, "m/s²", false);
  lab_value("mpu6050_ay", m1_ay, "m/s²", false);
  lab_value("mpu6050_az", m1_az, "m/s²", false);
  lab_value("mpu6050_gx", m1_gx, "°/s", false);
  lab_value("mpu6050_gy", m1_gy, "°/s", false);
  lab_value("mpu6050_gz", m1_gz, "°/s", false);
  lab_value("mpu6050_roll", m1_roll, "°", false);
  lab_value("mpu6050_pitch", m1_pitch, "°", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "mpu_6050_gy_521_mesu";
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
  Serial.println(F("\n# ESP32 LAB — MPU-6050 (GY-521) — mesure et affichage série"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // MPU-6050 (GY-521) (mpu6050)
  m1_ok = m1_mpu.begin(0x68, &Wire);
  if (m1_ok) {
    m1_mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    m1_mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    m1_mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }
  if (!m1_ok) Serial.println(F("# MPU-6050 (GY-521) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // MPU-6050 (GY-521) (mpu6050) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      sensors_event_t a, g, t;
      if (m1_mpu.getEvent(&a, &g, &t)) {
        m1_ax = a.acceleration.x; m1_ay = a.acceleration.y; m1_az = a.acceleration.z;
        m1_gx = g.gyro.x * 57.2958f; m1_gy = g.gyro.y * 57.2958f; m1_gz = g.gyro.z * 57.2958f;
        m1_roll = atan2(m1_ay, m1_az) * 57.2958f;
        m1_pitch = atan2(-m1_ax, sqrt(m1_ay * m1_ay + m1_az * m1_az)) * 57.2958f;
      }
      static float m1_prev[8];
      static uint32_t m1_printed = 0;
      bool m1_ch = false;
      m1_ch |= lab_changed(m1_ax, m1_prev[0]);
      m1_ch |= lab_changed(m1_ay, m1_prev[1]);
      m1_ch |= lab_changed(m1_az, m1_prev[2]);
      m1_ch |= lab_changed(m1_gx, m1_prev[3]);
      m1_ch |= lab_changed(m1_gy, m1_prev[4]);
      m1_ch |= lab_changed(m1_gz, m1_prev[5]);
      m1_ch |= lab_changed(m1_roll, m1_prev[6]);
      m1_ch |= lab_changed(m1_pitch, m1_prev[7]);
      if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
    }
  }
}
