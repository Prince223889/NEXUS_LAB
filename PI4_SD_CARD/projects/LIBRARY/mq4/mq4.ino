// ==========================================================================
//  MQ-4 (méthane, gaz naturel) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Sensible au méthane et au gaz naturel (200-10 000 ppm).
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    MQ-4 (méthane, gaz naturel) VCC -> 5V (VIN)
//    MQ-4 (méthane, gaz naturel) GND -> GND
//    MQ-4 (méthane, gaz naturel) AO -> GPIO34   (via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V)
//    MQ-4 (méthane, gaz naturel) DO (seuil) -> GPIO35
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_AO 34          // MQ-4 (méthane, gaz naturel) AO
#define M1_DO 35          // MQ-4 (méthane, gaz naturel) DO (seuil)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // MQ-4 (méthane, gaz naturel) : période de mesure

// ---------- Mesures publiées ----------
float m1_ppm = NAN;                // MQ-4 (méthane, gaz naturel) — CH4 (estimation) (ppm)
float m1_ratio = NAN;              // MQ-4 (méthane, gaz naturel) — Rs/R0
float m1_rsk = NAN;                // MQ-4 (méthane, gaz naturel) — Rs (kΩ)
float m1_alarm = NAN;              // MQ-4 (méthane, gaz naturel) — Seuil DO

// ---------- MQ-4 (méthane, gaz naturel) (mq4) ----------
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

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("mq4_ppm", m1_ppm, "ppm", false);
  lab_value("mq4_ratio", m1_ratio, "", false);
  lab_value("mq4_rsk", m1_rsk, "kΩ", false);
  lab_value("mq4_alarm", m1_alarm, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "mq_4_methane_gaz_nat";
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
  Serial.println(F("\n# ESP32 LAB — MQ-4 (méthane, gaz naturel) — mesure et affichage série"));
  // MQ-4 (méthane, gaz naturel) (mq4)
  if (M1_DO >= 0) pinMode(M1_DO, INPUT);
  Serial.println(F("# MQ-4 (méthane, gaz naturel) : préchauffage — laissez chauffer au moins 3 min (24 h la première fois)"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // MQ-4 (méthane, gaz naturel) (mq4) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    float rs = m1_rs();
    m1_rsk = rs;
    if (m1_r0 <= 0) {                                     // étalonnage automatique sur 10 mesures en air propre
      m1_calibSum += rs / 4.40f;
      if (++m1_calib >= 10) { m1_r0 = m1_calibSum / 10.0f; Serial.printf("# MQ-4 (méthane, gaz naturel) : R0 = %.2f kΩ (à reporter dans le paramètre r0)\n", m1_r0); }
    } else {
      m1_ratio = rs / m1_r0;
      m1_ppm = 1012.7000f * powf(m1_ratio, -2.7860f);
    }
    if (M1_DO >= 0) m1_alarm = digitalRead(M1_DO) == LOW ? 1 : 0;
    lab_print_m1();
  }
}
