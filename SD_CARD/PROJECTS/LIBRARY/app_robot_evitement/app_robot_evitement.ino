// ==========================================================================
//  Robot éviteur d'obstacles
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Le moteur recule quand un obstacle est à moins de 20 cm, avance sinon (base de robot mobile).
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    HC-SR04 (ultrasons) VCC        -> 5V (VIN)
//    HC-SR04 (ultrasons) GND        -> GND
//    HC-SR04 (ultrasons) TRIG       -> GPIO13
//    HC-SR04 (ultrasons) ECHO       -> GPIO34   (pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V)
//    Pont en H L298N (moteur CC) VCC -> 5V (VIN)
//    Pont en H L298N (moteur CC) GND -> GND
//    Pont en H L298N (moteur CC) ENA (retirer le cavalier) -> GPIO4
//    Pont en H L298N (moteur CC) IN1 -> GPIO14
//    Pont en H L298N (moteur CC) IN2 -> GPIO16
//  Points d'attention :
//    ! Consommation de pointe estimée 1595 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
//    ! Alimentez Pont en H L298N (moteur CC) directement en 5 V externe et reliez les masses (GND commun).
//    ! HC-SR04 (ultrasons) : la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_TRIG 13        // HC-SR04 (ultrasons) TRIG
#define M1_ECHO 34        // HC-SR04 (ultrasons) ECHO
#define M2_ENA 4         // Pont en H L298N (moteur CC) ENA (retirer le cavalier)
#define M2_IN1 14         // Pont en H L298N (moteur CC) IN1
#define M2_IN2 16         // Pont en H L298N (moteur CC) IN2

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 100;   // HC-SR04 (ultrasons) : période de mesure
static const uint32_t M2_PERIOD_MS = 2000;   // Pont en H L298N (moteur CC) : période de mesure

// ---------- Mesures publiées ----------
float m1_dist = NAN;               // HC-SR04 (ultrasons) — Distance (cm)

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

// ---------- Pont en H L298N (moteur CC) (l298n) ----------
float m2_speed = 0;
void m2_set(float pct) {
  m2_speed = constrain(pct, -100.0f, 100.0f);
  digitalWrite(M2_IN1, m2_speed > 0);
  digitalWrite(M2_IN2, m2_speed < 0);
  ledcWrite(M2_ENA, (uint32_t)(fabsf(m2_speed) * 255.0f / 100.0f));
}
void m2_on() { m2_set(100); }
void m2_off() { m2_set(0); }

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
  // Règle 1 : HC-SR04 (ultrasons) Distance < 20 cm → Pont en H L298N (moteur CC) set -60
  static int8_t rule1 = -1;
  if (!isnan(m1_dist)) {
    if (rule1 != 1 && m1_dist < 20.0f) { rule1 = 1; m2_set(-60.0f); }
    else if (rule1 != 0 && m1_dist > 25.0f) { rule1 = 0; m2_set(70.0f); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "robot_eviteur_d_obst";
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
  Serial.println(F("\n# ESP32 LAB — Robot éviteur d'obstacles"));
  // HC-SR04 (ultrasons) (hcsr04)
  pinMode(M1_TRIG, OUTPUT);
  pinMode(M1_ECHO, INPUT);
  // Pont en H L298N (moteur CC) (l298n)
  pinMode(M2_IN1, OUTPUT);
  pinMode(M2_IN2, OUTPUT);
  ledcAttach(M2_ENA, 1000, 8);
  m2_off();
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
  lab_rules();
}
