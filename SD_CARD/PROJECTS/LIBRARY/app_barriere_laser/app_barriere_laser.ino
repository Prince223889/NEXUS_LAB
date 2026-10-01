// ==========================================================================
//  Barrière laser d'alarme
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Un faisceau laser traverse la pièce ; s'il est coupé, la sirène retentit.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Module laser KY-008 (650 nm) VCC -> 3V3
//    Module laser KY-008 (650 nm) GND -> GND
//    Module laser KY-008 (650 nm) S -> GPIO4
//    Récepteur laser (module ISO203) VCC -> 3V3
//    Récepteur laser (module ISO203) GND -> GND
//    Récepteur laser (module ISO203) OUT -> GPIO34
//    Buzzer actif 5 V VCC           -> 3V3
//    Buzzer actif 5 V GND           -> GND
//    Buzzer actif 5 V + (via transistor si > 20 mA) -> GPIO13
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_S 4           // Module laser KY-008 (650 nm) S
#define M2_OUT 34         // Récepteur laser (module ISO203) OUT
#define M3_IO 13          // Buzzer actif 5 V + (via transistor si > 20 mA)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // Module laser KY-008 (650 nm) : période de mesure
static const uint32_t M2_PERIOD_MS = 50;   // Récepteur laser (module ISO203) : période de mesure
static const uint32_t M3_PERIOD_MS = 2000;   // Buzzer actif 5 V : période de mesure

// ---------- Mesures publiées ----------
float m2_beam = NAN;               // Récepteur laser (module ISO203) — Faisceau reçu (0/1)

// ---------- Module laser KY-008 (650 nm) (laser) ----------
bool m1_state = false;
void m1_on() { m1_state = true; digitalWrite(M1_S, HIGH); }
void m1_off() { m1_state = false; digitalWrite(M1_S, LOW); }
void m1_toggle() { if (m1_state) m1_off(); else m1_on(); }

// ---------- Récepteur laser (module ISO203) (laserrx) ----------

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
void lab_print_m2() {
  lab_value("laserrx_beam", m2_beam, "", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : Récepteur laser (module ISO203) Faisceau reçu (0/1) < 0.5 → Buzzer actif 5 V on
  static int8_t rule1 = -1;
  if (!isnan(m2_beam)) {
    const int8_t st = (m2_beam < 0.5f) ? 1 : 0;
    if (st != rule1) { rule1 = st; if (st) { m3_on(); } else { m3_off(); } }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "barriere_laser_d_ala";
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
  Serial.println(F("\n# ESP32 LAB — Barrière laser d'alarme"));
  // Module laser KY-008 (650 nm) (laser)
  pinMode(M1_S, OUTPUT);
  m1_off();
  // Récepteur laser (module ISO203) (laserrx)
  pinMode(M2_OUT, INPUT);
  // Buzzer actif 5 V (buzz)
  pinMode(M3_IO, OUTPUT);
  m3_off();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Module laser KY-008 (650 nm) (laser) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_toggle();
  }
  // Récepteur laser (module ISO203) (laserrx) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    m2_beam = digitalRead(M2_OUT) == HIGH ? 1 : 0;
    static float m2_prev[1];
    static uint32_t m2_printed = 0;
    bool m2_ch = false;
    m2_ch |= lab_changed(m2_beam, m2_prev[0]);
    if (m2_ch || now - m2_printed >= 5000) { m2_printed = now; lab_print_m2(); }
  }
  lab_rules();
}
