// ==========================================================================
//  Ventilateur proportionnel à la température
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  La vitesse du ventilateur 4 fils suit la température : 20 % à 22 °C, 100 % à 32 °C.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - DHT sensor library (1.4.7 ou plus récent) — Adafruit
//    - Adafruit Unified Sensor (1.1.15 ou plus récent) — Adafruit
//  Câblage :
//    DHT22 / AM2302 VCC             -> 3V3
//    DHT22 / AM2302 GND             -> GND
//    DHT22 / AM2302 DATA            -> GPIO4   (résistance de tirage 10 kΩ vers 3V3 (souvent déjà sur le module))
//    Ventilateur PC 4 fils (PWM 25 kHz) VCC -> 5V (VIN)
//    Ventilateur PC 4 fils (PWM 25 kHz) GND -> GND
//    Ventilateur PC 4 fils (PWM 25 kHz) PWM (bleu) -> GPIO14
//    Ventilateur PC 4 fils (PWM 25 kHz) TACH (vert) -> GPIO13
//    Ventilateur PC 4 fils (PWM 25 kHz) +12 V (jaune) -> alimentation 12 V externe   (GND commun avec l'ESP32)
// ==========================================================================
#include <Arduino.h>
#include <DHT.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_DATA 4        // DHT22 / AM2302 DATA
#define M2_PWM 14         // Ventilateur PC 4 fils (PWM 25 kHz) PWM (bleu)
#define M2_TACH 13        // Ventilateur PC 4 fils (PWM 25 kHz) TACH (vert)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2500;   // DHT22 / AM2302 : période de mesure
static const uint32_t M2_PERIOD_MS = 1000;   // Ventilateur PC 4 fils (PWM 25 kHz) : période de mesure

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // DHT22 / AM2302 — Température (°C)
float m1_hum = NAN;                // DHT22 / AM2302 — Humidité (%)
float m2_rpm = NAN;                // Ventilateur PC 4 fils (PWM 25 kHz) — Vitesse (tr/min)
float m2_duty = NAN;               // Ventilateur PC 4 fils (PWM 25 kHz) — Consigne (%)

// ---------- DHT22 / AM2302 (dht22) ----------
DHT m1_dht(M1_DATA, DHT22);

// ---------- Ventilateur PC 4 fils (PWM 25 kHz) (fan) ----------
volatile uint32_t m2_pulses = 0;
float m2_level = 0;
void IRAM_ATTR m2_isr() { m2_pulses = m2_pulses + 1; }
void m2_set(float pct) { m2_level = constrain(pct, 0.0f, 100.0f); ledcWrite(M2_PWM, (uint32_t)(m2_level * 255.0f / 100.0f)); }
void m2_on() { m2_set(100); }
void m2_off() { m2_set(0); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("dht22_temp", m1_temp, "°C", false);
  lab_value("dht22_hum", m1_hum, "%", true);
}
void lab_print_m2() {
  lab_value("fan_rpm", m2_rpm, "tr/min", false);
  lab_value("fan_duty", m2_duty, "%", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : Ventilateur PC 4 fils (PWM 25 kHz) suit DHT22 / AM2302 Température (22…32 → 20…100)
  if (!isnan(m1_temp)) {
    static float last1 = NAN;
    const float y = 20.0f + (constrain(m1_temp, 22.0f, 32.0f) - 22.0f) * (80.0f) / (10.0f);
    if (isnan(last1) || fabsf(y - last1) >= 0.4f) { last1 = y; m2_set(y); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "ventilateur_proporti";
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
  Serial.println(F("\n# ESP32 LAB — Ventilateur proportionnel à la température"));
  // DHT22 / AM2302 (dht22)
  m1_dht.begin();
  // Ventilateur PC 4 fils (PWM 25 kHz) (fan)
  ledcAttach(M2_PWM, 25000, 8);
  pinMode(M2_TACH, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(M2_TACH), m2_isr, FALLING);
  m2_set(50);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // DHT22 / AM2302 (dht22) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_temp = m1_dht.readTemperature();
    m1_hum = m1_dht.readHumidity();
    lab_print_m1();
  }
  // Ventilateur PC 4 fils (PWM 25 kHz) (fan) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    noInterrupts();
    uint32_t n = m2_pulses;
    m2_pulses = 0;
    interrupts();
    m2_rpm = n * 60000.0f / M2_PERIOD_MS / 2.0f;    // 2 impulsions par tour
    m2_duty = m2_level;
    lab_print_m2();
  }
  lab_rules();
}
