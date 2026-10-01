// ==========================================================================
//  Détecteur de flamme et fumée
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Alarme dès qu'une flamme est vue par le capteur IR ; niveau de fumée MQ-2 surveillé.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Détecteur de flamme IR (KY-026) VCC -> 3V3
//    Détecteur de flamme IR (KY-026) GND -> GND
//    Détecteur de flamme IR (KY-026) DO -> GPIO36
//    Détecteur de flamme IR (KY-026) AO -> GPIO34
//    MQ-2 (fumée, GPL, butane) VCC  -> 5V (VIN)
//    MQ-2 (fumée, GPL, butane) GND  -> GND
//    MQ-2 (fumée, GPL, butane) AO   -> GPIO35   (via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V)
//    MQ-2 (fumée, GPL, butane) DO (seuil) -> GPIO39
//    Buzzer actif 5 V VCC           -> 3V3
//    Buzzer actif 5 V GND           -> GND
//    Buzzer actif 5 V + (via transistor si > 20 mA) -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_DO 36          // Détecteur de flamme IR (KY-026) DO
#define M1_AO 34          // Détecteur de flamme IR (KY-026) AO
#define M2_AO 35          // MQ-2 (fumée, GPL, butane) AO
#define M2_DO 39          // MQ-2 (fumée, GPL, butane) DO (seuil)
#define M3_IO 4          // Buzzer actif 5 V + (via transistor si > 20 mA)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 200;   // Détecteur de flamme IR (KY-026) : période de mesure
static const uint32_t M2_PERIOD_MS = 1000;   // MQ-2 (fumée, GPL, butane) : période de mesure
static const uint32_t M3_PERIOD_MS = 2000;   // Buzzer actif 5 V : période de mesure

// ---------- Mesures publiées ----------
float m1_fire = NAN;               // Détecteur de flamme IR (KY-026) — Flamme (0/1)
float m1_ir = NAN;                 // Détecteur de flamme IR (KY-026) — Intensité IR (%)
float m2_ppm = NAN;                // MQ-2 (fumée, GPL, butane) — GPL (estimation) (ppm)
float m2_ratio = NAN;              // MQ-2 (fumée, GPL, butane) — Rs/R0
float m2_rsk = NAN;                // MQ-2 (fumée, GPL, butane) — Rs (kΩ)
float m2_alarm = NAN;              // MQ-2 (fumée, GPL, butane) — Seuil DO

// ---------- Détecteur de flamme IR (KY-026) (flame) ----------

// ---------- MQ-2 (fumée, GPL, butane) (mq2) ----------
float m2_r0 = 0;
uint8_t m2_calib = 0;
float m2_calibSum = 0;
float m2_rs() {
  uint32_t s = 0;
  for (int i = 0; i < 20; i++) s += analogReadMilliVolts(M2_AO);
  float v = (s / 20.0f) * 1.5 / 1000.0f;       // tension réelle du capteur (V)
  if (v < 0.01f) v = 0.01f;
  return 10.0 * (5.0f - v) / v;                   // résistance du capteur (kΩ)
}

// ---------- Buzzer actif 5 V (buzz) ----------
bool m3_state = false;
void m3_on() { m3_state = true; digitalWrite(M3_IO, HIGH); }
void m3_off() { m3_state = false; digitalWrite(M3_IO, LOW); }
void m3_toggle() { if (m3_state) m3_off(); else m3_on(); }

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
  lab_value("flame_fire", m1_fire, "", false);
  lab_value("flame_ir", m1_ir, "%", true);
}
void lab_print_m2() {
  lab_value("mq2_ppm", m2_ppm, "ppm", false);
  lab_value("mq2_ratio", m2_ratio, "", false);
  lab_value("mq2_rsk", m2_rsk, "kΩ", false);
  lab_value("mq2_alarm", m2_alarm, "", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : Détecteur de flamme IR (KY-026) Flamme (0/1) > 0.5 → Buzzer actif 5 V on
  static int8_t rule1 = -1;
  if (!isnan(m1_fire)) {
    const int8_t st = (m1_fire > 0.5f) ? 1 : 0;
    if (st != rule1) { rule1 = st; if (st) { m3_on(); } else { m3_off(); } }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "detecteur_de_flamme_";
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
  Serial.println(F("\n# ESP32 LAB — Détecteur de flamme et fumée"));
  // Détecteur de flamme IR (KY-026) (flame)
  pinMode(M1_DO, INPUT);
  // MQ-2 (fumée, GPL, butane) (mq2)
  if (M2_DO >= 0) pinMode(M2_DO, INPUT);
  Serial.println(F("# MQ-2 (fumée, GPL, butane) : préchauffage — laissez chauffer au moins 3 min (24 h la première fois)"));
  // Buzzer actif 5 V (buzz)
  pinMode(M3_IO, OUTPUT);
  m3_off();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Détecteur de flamme IR (KY-026) (flame) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_fire = digitalRead(M1_DO) == LOW ? 1 : 0;
    if (M1_AO >= 0) m1_ir = 100.0f - analogReadMilliVolts(M1_AO) * 100.0f / 3300.0f;
    static float m1_prev[2];
    static uint32_t m1_printed = 0;
    bool m1_ch = false;
    m1_ch |= lab_changed(m1_fire, m1_prev[0]);
    m1_ch |= lab_changed(m1_ir, m1_prev[1]);
    if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
  }
  // MQ-2 (fumée, GPL, butane) (mq2) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    float rs = m2_rs();
    m2_rsk = rs;
    if (m2_r0 <= 0) {                                     // étalonnage automatique sur 10 mesures en air propre
      m2_calibSum += rs / 9.83f;
      if (++m2_calib >= 10) { m2_r0 = m2_calibSum / 10.0f; Serial.printf("# MQ-2 (fumée, GPL, butane) : R0 = %.2f kΩ (à reporter dans le paramètre r0)\n", m2_r0); }
    } else {
      m2_ratio = rs / m2_r0;
      m2_ppm = 574.2500f * powf(m2_ratio, -2.2220f);
    }
    if (M2_DO >= 0) m2_alarm = digitalRead(M2_DO) == LOW ? 1 : 0;
    lab_print_m2();
  }
  lab_rules();
}
