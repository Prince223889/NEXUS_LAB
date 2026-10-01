// ==========================================================================
//  Radar de recul sonore
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Plus l'obstacle est proche, plus le bip est aigu ; distance sur afficheur 4 chiffres.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - TM1637 (1.2.0 ou plus récent) — Avishay Orpaz
//  Câblage :
//    HC-SR04 (ultrasons) VCC        -> 5V (VIN)
//    HC-SR04 (ultrasons) GND        -> GND
//    HC-SR04 (ultrasons) TRIG       -> GPIO13
//    HC-SR04 (ultrasons) ECHO       -> GPIO34   (pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V)
//    Buzzer passif / haut-parleur piézo VCC -> 3V3
//    Buzzer passif / haut-parleur piézo GND -> GND
//    Buzzer passif / haut-parleur piézo + -> GPIO4
//    Afficheur 4 chiffres TM1637 VCC -> 3V3
//    Afficheur 4 chiffres TM1637 GND -> GND
//    Afficheur 4 chiffres TM1637 CLK -> GPIO14
//    Afficheur 4 chiffres TM1637 DIO -> GPIO16
//  Points d'attention :
//    ! HC-SR04 (ultrasons) : la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.
// ==========================================================================
#include <Arduino.h>
#include <TM1637Display.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_TRIG 13        // HC-SR04 (ultrasons) TRIG
#define M1_ECHO 34        // HC-SR04 (ultrasons) ECHO
#define M2_IO 4          // Buzzer passif / haut-parleur piézo +
#define M3_CLK 14         // Afficheur 4 chiffres TM1637 CLK
#define M3_DIO 16         // Afficheur 4 chiffres TM1637 DIO

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 100;   // HC-SR04 (ultrasons) : période de mesure
static const uint32_t M2_PERIOD_MS = 4000;   // Buzzer passif / haut-parleur piézo : période de mesure
static const uint32_t M3_PERIOD_MS = 500;   // Afficheur 4 chiffres TM1637 : période de mesure

// ---------- Mesures publiées ----------
float m1_dist = NAN;               // HC-SR04 (ultrasons) — Distance (cm)

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Distance", "cm", &m1_dist}
};
const int LAB_OUT_COUNT = 1;

// ---------- HC-SR04 (ultrasons) (hcsr04) ----------
float m1_measure() {
  digitalWrite(M1_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(M1_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(M1_TRIG, LOW);
  unsigned long us = pulseIn(M1_ECHO, HIGH, 30000UL);   // 30 ms ≈ 5 m
  return us ? us * 0.0343f / 2.0f : NAN;               // vitesse du son 343 m/s à 20 °C
}

// ---------- Buzzer passif / haut-parleur piézo (tone) ----------
void m2_set(float hz) { tone(M2_IO, (unsigned int)hz); }
void m2_on() { tone(M2_IO, 1000); }
void m2_off() { noTone(M2_IO); }
void m2_melody() {
  static const uint16_t notes[] = {262, 294, 330, 349, 392, 440, 494, 523};   // do ré mi fa sol la si do
  for (uint16_t n : notes) { tone(M2_IO, n, 150); delay(180); }
  noTone(M2_IO);
}

// ---------- Afficheur 4 chiffres TM1637 (seg4) ----------
TM1637Display m3_d(M3_CLK, M3_DIO);

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
  lab_value("hcsr04_dist", m1_dist, "cm", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : Buzzer passif / haut-parleur piézo suit HC-SR04 (ultrasons) Distance (100…5 → 200…2500)
  if (!isnan(m1_dist)) {
    static float last1 = NAN;
    const float y = 200.0f + (constrain(m1_dist, 5.0f, 100.0f) - 100.0f) * (2300.0f) / (-95.0f);
    if (isnan(last1) || fabsf(y - last1) >= 11.5f) { last1 = y; m2_set(y); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "radar_de_recul_sonor";
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
  Serial.println(F("\n# ESP32 LAB — Radar de recul sonore"));
  // HC-SR04 (ultrasons) (hcsr04)
  pinMode(M1_TRIG, OUTPUT);
  pinMode(M1_ECHO, INPUT);
  // Buzzer passif / haut-parleur piézo (tone)
  pinMode(M2_IO, OUTPUT);
  // Afficheur 4 chiffres TM1637 (seg4)
  m3_d.setBrightness(4);
  m3_d.clear();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // HC-SR04 (ultrasons) (hcsr04) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_dist = m1_measure();
    static float m1_prev[1];
    static uint32_t m1_printed = 0;
    bool m1_ch = false;
    m1_ch |= lab_changed(m1_dist, m1_prev[0]);
    if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
  }
  // Afficheur 4 chiffres TM1637 (seg4) — toutes les M3_PERIOD_MS
  static uint32_t m3_last = 0;
  if (now - m3_last >= M3_PERIOD_MS) {
    m3_last = now;
    if (LAB_OUT_COUNT > 0 && lab_outs[0].value && !isnan(*lab_outs[0].value)) {
      float v = *lab_outs[0].value;
      if (fabsf(v) < 100) m3_d.showNumberDecEx((int)lroundf(v * 10), 0b00100000, false);   // 1 décimale
      else m3_d.showNumberDec((int)lroundf(v));
    } else {
      m3_d.showNumberDecEx((millis() / 1000) % 10000, 0b01000000, true);
    }
  }
  lab_rules();
}
