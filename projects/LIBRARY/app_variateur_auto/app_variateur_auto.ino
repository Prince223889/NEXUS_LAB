// ==========================================================================
//  Éclairage à intensité automatique
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Une LED/ruban compense la lumière ambiante : plus il fait sombre, plus elle éclaire.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Photorésistance (LDR / GL5528) VCC -> 3V3
//    Photorésistance (LDR / GL5528) GND -> GND
//    Photorésistance (LDR / GL5528) point milieu -> GPIO34   (LDR entre 3V3 et le point milieu, 10 kΩ entre le point milieu et GND)
//    LED à intensité variable (PWM) VCC -> 3V3
//    LED à intensité variable (PWM) GND -> GND
//    LED à intensité variable (PWM) anode via 220 Ω -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_AO 34          // Photorésistance (LDR / GL5528) point milieu
#define M2_LED 4         // LED à intensité variable (PWM) anode via 220 Ω

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // Photorésistance (LDR / GL5528) : période de mesure
static const uint32_t M2_PERIOD_MS = 20;   // LED à intensité variable (PWM) : période de mesure

// ---------- Mesures publiées ----------
float m1_light = NAN;              // Photorésistance (LDR / GL5528) — Luminosité (%)

// ---------- Photorésistance (LDR / GL5528) (ldr) ----------

// ---------- LED à intensité variable (PWM) (dim) ----------
float m2_level = 0;
void m2_set(float pct) { m2_level = constrain(pct, 0.0f, 100.0f); ledcWrite(M2_LED, (uint32_t)(m2_level * m2_level * 1023.0f / 10000.0f)); }  // courbe quadratique = perception linéaire
void m2_on() { m2_set(100); }
void m2_off() { m2_set(0); }
void m2_toggle() { m2_set(m2_level > 0 ? 0 : 100); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("ldr_light", m1_light, "%", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : LED à intensité variable (PWM) suit Photorésistance (LDR / GL5528) Luminosité (80…10 → 0…100)
  if (!isnan(m1_light)) {
    static float last1 = NAN;
    const float y = 0.0f + (constrain(m1_light, 10.0f, 80.0f) - 80.0f) * (100.0f) / (-70.0f);
    if (isnan(last1) || fabsf(y - last1) >= 0.5f) { last1 = y; m2_set(y); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "eclairage_a_intensit";
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
  Serial.println(F("\n# ESP32 LAB — Éclairage à intensité automatique"));
  // LED à intensité variable (PWM) (dim)
  ledcAttach(M2_LED, 5000, 10);
  m2_off();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Photorésistance (LDR / GL5528) (ldr) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    uint32_t s = 0;
    for (int i = 0; i < 16; i++) s += analogReadMilliVolts(M1_AO);
    float mv = s / 16.0f;
    m1_light = constrain(mv * 100.0f / 3300.0f, 0.0f, 100.0f);
    lab_print_m1();
  }
  lab_rules();
}
