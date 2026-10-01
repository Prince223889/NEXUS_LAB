// ==========================================================================
//  Alarme anti-intrusion
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Détecteur de mouvement PIR + contact de porte : sirène et voyant.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    HC-SR501 (PIR infrarouge passif) VCC -> 5V (VIN)
//    HC-SR501 (PIR infrarouge passif) GND -> GND
//    HC-SR501 (PIR infrarouge passif) OUT -> GPIO34
//    Contact reed (ILS) VCC         -> 3V3
//    Contact reed (ILS) GND         -> GND
//    Contact reed (ILS) signal      -> GPIO4   (l'autre borne vers GND)
//    Buzzer actif 5 V VCC           -> 3V3
//    Buzzer actif 5 V GND           -> GND
//    Buzzer actif 5 V + (via transistor si > 20 mA) -> GPIO13
//    LED + résistance 220 Ω VCC     -> 3V3
//    LED + résistance 220 Ω GND     -> GND
//    LED + résistance 220 Ω anode (+) via 220 Ω -> GPIO14   (cathode (patte courte) vers GND)
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_OUT 34         // HC-SR501 (PIR infrarouge passif) OUT
#define M2_IN 4          // Contact reed (ILS) signal
#define M3_IO 13          // Buzzer actif 5 V + (via transistor si > 20 mA)
#define M4_LED 14         // LED + résistance 220 Ω anode (+) via 220 Ω

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 100;   // HC-SR501 (PIR infrarouge passif) : période de mesure
static const uint32_t M2_PERIOD_MS = 50;   // Contact reed (ILS) : période de mesure
static const uint32_t M3_PERIOD_MS = 2000;   // Buzzer actif 5 V : période de mesure
static const uint32_t M4_PERIOD_MS = 1000;   // LED + résistance 220 Ω : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "alarme_anti_intrusio";

// ---------- Mesures publiées ----------
float m1_motion = NAN;             // HC-SR501 (PIR infrarouge passif) — Présence (0/1)
float m2_state = NAN;              // Contact reed (ILS) — État (0/1)
float m2_count = NAN;              // Contact reed (ILS) — Déclenchements

// ---------- Réseau ----------
WiFiUDP lab_udp;

// ---------- HC-SR501 (PIR infrarouge passif) (pir_hcsr501) ----------
bool m1_last = false;

// ---------- Contact reed (ILS) (porte) ----------
bool m2_prev = false;
uint32_t m2_events = 0;

// ---------- Buzzer actif 5 V (sirene) ----------
bool m3_state = false;
void m3_on() { m3_state = true; digitalWrite(M3_IO, HIGH); }
void m3_off() { m3_state = false; digitalWrite(M3_IO, LOW); }
void m3_toggle() { if (m3_state) m3_off(); else m3_on(); }

// ---------- LED + résistance 220 Ω (voyant) ----------
bool m4_state = false;
void m4_on() { m4_state = true; digitalWrite(M4_LED, HIGH); }
void m4_off() { m4_state = false; digitalWrite(M4_LED, LOW); }
void m4_toggle() { if (m4_state) m4_off(); else m4_on(); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_send_master(const char *key, float v, const char *unit) {
  if (WiFi.status() != WL_CONNECTED || isnan(v)) return;
  lab_udp.beginPacket(IPAddress(192, 168, 4, 1), 4213);
  lab_udp.printf("LAB|%s|%s|%.3f|%s\n", LAB_DEVICE, key, v, unit);
  lab_udp.endPacket();
}
bool lab_changed(float v, float &prev) {
  const bool same = (v == prev) || (isnan(v) && isnan(prev));
  prev = v;
  return !same;
}
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  lab_send_master(key, v, unit);
}
void lab_print_m1() {
  lab_value("pir_hcsr501_motion", m1_motion, "", true);
}
void lab_print_m2() {
  lab_value("porte_state", m2_state, "", false);
  lab_value("porte_count", m2_count, "", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : HC-SR501 (PIR infrarouge passif) Présence (0/1) > 0.5 → Buzzer actif 5 V on
  static int8_t rule1 = -1;
  if (!isnan(m1_motion)) {
    const int8_t st = (m1_motion > 0.5f) ? 1 : 0;
    if (st != rule1) { rule1 = st; if (st) { m3_on(); } else { m3_off(); } }
  }
  // Règle 2 : Contact reed (ILS) État (0/1) < 0.5 → LED + résistance 220 Ω on
  static int8_t rule2 = -1;
  if (!isnan(m2_state)) {
    const int8_t st = (m2_state < 0.5f) ? 1 : 0;
    if (st != rule2) { rule2 = st; if (st) { m4_on(); } else { m4_off(); } }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "alarme_anti_intrusio";
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
  Serial.println(F("\n# ESP32 LAB — Alarme anti-intrusion"));
  // HC-SR501 (PIR infrarouge passif) (pir_hcsr501)
  pinMode(M1_OUT, INPUT);
  // Contact reed (ILS) (porte)
  pinMode(M2_IN, INPUT_PULLUP);
  // Buzzer actif 5 V (sirene)
  pinMode(M3_IO, OUTPUT);
  m3_off();
  // LED + résistance 220 Ω (voyant)
  pinMode(M4_LED, OUTPUT);
  m4_off();
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
  // HC-SR501 (PIR infrarouge passif) (pir_hcsr501) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    bool m = digitalRead(M1_OUT) == HIGH;
    if (m && !m1_last) Serial.println(F("# mouvement détecté"));
    m1_last = m;
    m1_motion = m ? 1 : 0;
    static float m1_prev[1];
    static uint32_t m1_printed = 0;
    bool m1_ch = false;
    m1_ch |= lab_changed(m1_motion, m1_prev[0]);
    if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
  }
  // Contact reed (ILS) (porte) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    bool on = digitalRead(M2_IN) == LOW;
    if (on && !m2_prev) { m2_events++; Serial.printf("# Contact reed (ILS) : déclenché (%lu)\n", (unsigned long)m2_events); }
    m2_prev = on;
    m2_state = on ? 1 : 0;
    m2_count = m2_events;
    static float m2_prev[2];
    static uint32_t m2_printed = 0;
    bool m2_ch = false;
    m2_ch |= lab_changed(m2_state, m2_prev[0]);
    m2_ch |= lab_changed(m2_count, m2_prev[1]);
    if (m2_ch || now - m2_printed >= 5000) { m2_printed = now; lab_print_m2(); }
  }
  lab_rules();
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
}
