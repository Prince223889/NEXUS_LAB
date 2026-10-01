// ==========================================================================
//  Capteur à effet Hall A3144 (KY-003) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Interrupteur magnétique : détecte le pôle sud d'un aimant (compte-tours, fin de course).
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Capteur à effet Hall A3144 (KY-003) VCC -> 3V3
//    Capteur à effet Hall A3144 (KY-003) GND -> GND
//    Capteur à effet Hall A3144 (KY-003) S (collecteur ouvert) -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_OUT 4         // Capteur à effet Hall A3144 (KY-003) S (collecteur ouvert)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 50;   // Capteur à effet Hall A3144 (KY-003) : période de mesure

// ---------- Mesures publiées ----------
float m1_magnet = NAN;             // Capteur à effet Hall A3144 (KY-003) — Aimant (0/1)
float m1_pulses = NAN;             // Capteur à effet Hall A3144 (KY-003) — Impulsions

// ---------- Capteur à effet Hall A3144 (KY-003) (hall) ----------
volatile uint32_t m1_count = 0;
void IRAM_ATTR m1_isr() { m1_count = m1_count + 1; }

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
  lab_value("hall_magnet", m1_magnet, "", false);
  lab_value("hall_pulses", m1_pulses, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "capteur_a_effet_hall";
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
  Serial.println(F("\n# ESP32 LAB — Capteur à effet Hall A3144 (KY-003) — mesure et affichage série"));
  // Capteur à effet Hall A3144 (KY-003) (hall)
  pinMode(M1_OUT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(M1_OUT), m1_isr, FALLING);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Capteur à effet Hall A3144 (KY-003) (hall) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_magnet = digitalRead(M1_OUT) == LOW ? 1 : 0;
    m1_pulses = m1_count;
    static float m1_prev[2];
    static uint32_t m1_printed = 0;
    bool m1_ch = false;
    m1_ch |= lab_changed(m1_magnet, m1_prev[0]);
    m1_ch |= lab_changed(m1_pulses, m1_prev[1]);
    if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
  }
}
