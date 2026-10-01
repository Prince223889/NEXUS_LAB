// ==========================================================================
//  Aide au stationnement lumineuse (garage)
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Capteur laser au fond du garage : l'anneau passe du vert au rouge en approchant du mur.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit_VL53L0X (1.2.5 ou plus récent) — Adafruit
//    - Adafruit NeoPixel (1.15.5 ou plus récent) — Adafruit
//  Câblage :
//    VL53L0X (temps de vol laser) VCC -> 3V3
//    VL53L0X (temps de vol laser) GND -> GND
//    VL53L0X (temps de vol laser) SDA -> GPIO21
//    VL53L0X (temps de vol laser) SCL -> GPIO22
//    VL53L0X (temps de vol laser) XSHUT -> GPIO4   (pour changer d'adresse avec plusieurs capteurs)
//    Ruban / anneau LED WS2812B (NeoPixel) VCC -> 5V (VIN)
//    Ruban / anneau LED WS2812B (NeoPixel) GND -> GND
//    Ruban / anneau LED WS2812B (NeoPixel) DIN -> GPIO13   (résistance 330 Ω en série, condensateur 1000 µF sur l'alimentation)
//  Points d'attention :
//    ! Consommation de pointe estimée 579 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
//    ! Alimentez Ruban / anneau LED WS2812B (NeoPixel) directement en 5 V externe et reliez les masses (GND commun).
//    ! Ruban / anneau LED WS2812B (NeoPixel) : la donnée 3,3 V fonctionne en général ; pour les longs rubans, un 74AHCT125 améliore la fiabilité.
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M1_XSHUT 4       // VL53L0X (temps de vol laser) XSHUT
#define M2_DIN 13         // Ruban / anneau LED WS2812B (NeoPixel) DIN

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 100;   // VL53L0X (temps de vol laser) : période de mesure
static const uint32_t M2_PERIOD_MS = 30;   // Ruban / anneau LED WS2812B (NeoPixel) : période de mesure

// ---------- Mesures publiées ----------
float m1_dist = NAN;               // VL53L0X (temps de vol laser) — Distance (cm)

// ---------- VL53L0X (temps de vol laser) (vl53l0x) ----------
bool m1_ok = false;
Adafruit_VL53L0X m1_lox;

// ---------- Ruban / anneau LED WS2812B (NeoPixel) (strip) ----------
Adafruit_NeoPixel m2_px(12, M2_DIN, NEO_GRB + NEO_KHZ800);
uint16_t m2_hue = 0;
void m2_fill(uint32_t c) { m2_px.fill(c); m2_px.show(); }
void m2_set(float hueDeg) { m2_fill(m2_px.gamma32(m2_px.ColorHSV((uint16_t)(hueDeg * 182.04f)))); }
void m2_on() { m2_fill(m2_px.Color(255, 255, 255)); }
void m2_off() { m2_fill(0); }

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
  lab_value("vl53l0x_dist", m1_dist, "cm", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : Ruban / anneau LED WS2812B (NeoPixel) suit VL53L0X (temps de vol laser) Distance (100…10 → 120…0)
  if (!isnan(m1_dist)) {
    static float last1 = NAN;
    const float y = 120.0f + (constrain(m1_dist, 10.0f, 100.0f) - 100.0f) * (-120.0f) / (-90.0f);
    if (isnan(last1) || fabsf(y - last1) >= 0.6f) { last1 = y; m2_set(y); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "aide_au_stationnemen";
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
  Serial.println(F("\n# ESP32 LAB — Aide au stationnement lumineuse (garage)"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // VL53L0X (temps de vol laser) (vl53l0x)
  if (M1_XSHUT >= 0) { pinMode(M1_XSHUT, OUTPUT); digitalWrite(M1_XSHUT, HIGH); delay(10); }
  m1_ok = m1_lox.begin(0x29, false, &Wire);
  if (!m1_ok) Serial.println(F("# VL53L0X (temps de vol laser) : non détecté — vérifiez le câblage et l'alimentation"));
  // Ruban / anneau LED WS2812B (NeoPixel) (strip)
  m2_px.begin();
  m2_px.setBrightness(60);
  m2_off();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // VL53L0X (temps de vol laser) (vl53l0x) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      VL53L0X_RangingMeasurementData_t m;
      m1_lox.rangingTest(&m, false);
      m1_dist = (m.RangeStatus != 4) ? m.RangeMilliMeter / 10.0f : NAN;   // 4 = hors de portée
      static float m1_prev[1];
      static uint32_t m1_printed = 0;
      bool m1_ch = false;
      m1_ch |= lab_changed(m1_dist, m1_prev[0]);
      if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
    }
  }
  lab_rules();
}
