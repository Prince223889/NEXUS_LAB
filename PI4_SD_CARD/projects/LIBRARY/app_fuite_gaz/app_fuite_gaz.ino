// ==========================================================================
//  Détecteur de fuite de gaz
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Alarme sonore et coupure d'une électrovanne (relais) au-delà d'un seuil de gaz (démonstration pédagogique).
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    MQ-2 (fumée, GPL, butane) VCC  -> 5V (VIN)
//    MQ-2 (fumée, GPL, butane) GND  -> GND
//    MQ-2 (fumée, GPL, butane) AO   -> GPIO34   (via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V)
//    MQ-2 (fumée, GPL, butane) DO (seuil) -> GPIO35
//    Buzzer actif 5 V VCC           -> 3V3
//    Buzzer actif 5 V GND           -> GND
//    Buzzer actif 5 V + (via transistor si > 20 mA) -> GPIO4
//    Module relais 5 V (1 canal) VCC -> 5V (VIN)
//    Module relais 5 V (1 canal) GND -> GND
//    Module relais 5 V (1 canal) IN -> GPIO13
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_AO 34          // MQ-2 (fumée, GPL, butane) AO
#define M1_DO 35          // MQ-2 (fumée, GPL, butane) DO (seuil)
#define M2_IO 4          // Buzzer actif 5 V + (via transistor si > 20 mA)
#define M3_IN 13          // Module relais 5 V (1 canal) IN

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // MQ-2 (fumée, GPL, butane) : période de mesure
static const uint32_t M2_PERIOD_MS = 2000;   // Buzzer actif 5 V : période de mesure
static const uint32_t M3_PERIOD_MS = 5000;   // Module relais 5 V (1 canal) : période de mesure

// ---------- Mesures publiées ----------
float m1_ppm = NAN;                // MQ-2 (fumée, GPL, butane) — GPL (estimation) (ppm)
float m1_ratio = NAN;              // MQ-2 (fumée, GPL, butane) — Rs/R0
float m1_rsk = NAN;                // MQ-2 (fumée, GPL, butane) — Rs (kΩ)
float m1_alarm = NAN;              // MQ-2 (fumée, GPL, butane) — Seuil DO

// ---------- MQ-2 (fumée, GPL, butane) (mq2) ----------
float m1_r0 = 0;
uint8_t m1_calib = 0;
float m1_calibSum = 0;
float m1_rs() {
  uint32_t s = 0;
  for (int i = 0; i < 20; i++) s += analogReadMilliVolts(M1_AO);
  float v = (s / 20.0f) * 1.5 / 1000.0f;       // tension réelle du capteur (V)
  if (v < 0.01f) v = 0.01f;
  return 10.0 * (5.0f - v) / v;                   // résistance du capteur (kΩ)
}

// ---------- Buzzer actif 5 V (buzz) ----------
bool m2_state = false;
void m2_on() { m2_state = true; digitalWrite(M2_IO, HIGH); }
void m2_off() { m2_state = false; digitalWrite(M2_IO, LOW); }
void m2_toggle() { if (m2_state) m2_off(); else m2_on(); }

// ---------- Module relais 5 V (1 canal) (vanne) ----------
bool m3_state = false;
void m3_write(bool on) { m3_state = on; digitalWrite(M3_IN, (true) ? !on : on); }
void m3_on() { m3_write(true); }
void m3_off() { m3_write(false); }
void m3_toggle() { m3_write(!m3_state); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("mq2_ppm", m1_ppm, "ppm", false);
  lab_value("mq2_ratio", m1_ratio, "", false);
  lab_value("mq2_rsk", m1_rsk, "kΩ", false);
  lab_value("mq2_alarm", m1_alarm, "", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : MQ-2 (fumée, GPL, butane) Rs/R0 < 0.6 → Buzzer actif 5 V on
  static int8_t rule1 = -1;
  if (!isnan(m1_ratio)) {
    if (rule1 != 1 && m1_ratio < 0.6f) { rule1 = 1; m2_on(); }
    else if (rule1 != 0 && m1_ratio > 0.7f) { rule1 = 0; m2_off(); }
  }
  // Règle 2 : MQ-2 (fumée, GPL, butane) Rs/R0 < 0.6 → Module relais 5 V (1 canal) on
  static int8_t rule2 = -1;
  if (!isnan(m1_ratio)) {
    if (rule2 != 1 && m1_ratio < 0.6f) { rule2 = 1; m3_on(); }
    else if (rule2 != 0 && m1_ratio > 0.7f) { rule2 = 0; m3_off(); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "detecteur_de_fuite_d";
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
  Serial.println(F("\n# ESP32 LAB — Détecteur de fuite de gaz"));
  // MQ-2 (fumée, GPL, butane) (mq2)
  if (M1_DO >= 0) pinMode(M1_DO, INPUT);
  Serial.println(F("# MQ-2 (fumée, GPL, butane) : préchauffage — laissez chauffer au moins 3 min (24 h la première fois)"));
  // Buzzer actif 5 V (buzz)
  pinMode(M2_IO, OUTPUT);
  m2_off();
  // Module relais 5 V (1 canal) (vanne)
  pinMode(M3_IN, OUTPUT);
  m3_off();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // MQ-2 (fumée, GPL, butane) (mq2) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    float rs = m1_rs();
    m1_rsk = rs;
    if (m1_r0 <= 0) {                                     // étalonnage automatique sur 10 mesures en air propre
      m1_calibSum += rs / 9.83f;
      if (++m1_calib >= 10) { m1_r0 = m1_calibSum / 10.0f; Serial.printf("# MQ-2 (fumée, GPL, butane) : R0 = %.2f kΩ (à reporter dans le paramètre r0)\n", m1_r0); }
    } else {
      m1_ratio = rs / m1_r0;
      m1_ppm = 574.2500f * powf(m1_ratio, -2.2220f);
    }
    if (M1_DO >= 0) m1_alarm = digitalRead(M1_DO) == LOW ? 1 : 0;
    lab_print_m1();
  }
  lab_rules();
}
