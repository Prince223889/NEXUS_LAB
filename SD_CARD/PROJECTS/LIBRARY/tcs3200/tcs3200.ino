// ==========================================================================
//  TCS3200 / TCS230 (couleur) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Capteur de couleur à sortie en fréquence : filtres sélectionnés par S2/S3, échelle par S0/S1.
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    TCS3200 / TCS230 (couleur) VCC -> 3V3
//    TCS3200 / TCS230 (couleur) GND -> GND
//    TCS3200 / TCS230 (couleur) S0  -> GPIO4
//    TCS3200 / TCS230 (couleur) S1  -> GPIO13
//    TCS3200 / TCS230 (couleur) S2  -> GPIO14
//    TCS3200 / TCS230 (couleur) S3  -> GPIO16
//    TCS3200 / TCS230 (couleur) OUT -> GPIO34
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_S0 4          // TCS3200 / TCS230 (couleur) S0
#define M1_S1 13          // TCS3200 / TCS230 (couleur) S1
#define M1_S2 14          // TCS3200 / TCS230 (couleur) S2
#define M1_S3 16          // TCS3200 / TCS230 (couleur) S3
#define M1_OUT 34         // TCS3200 / TCS230 (couleur) OUT

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 500;   // TCS3200 / TCS230 (couleur) : période de mesure

// ---------- Mesures publiées ----------
float m1_red = NAN;                // TCS3200 / TCS230 (couleur) — Rouge (Hz)
float m1_green = NAN;              // TCS3200 / TCS230 (couleur) — Vert (Hz)
float m1_blue = NAN;               // TCS3200 / TCS230 (couleur) — Bleu (Hz)

// ---------- TCS3200 / TCS230 (couleur) (tcs3200) ----------
uint32_t m1_measure(bool s2, bool s3) {
  digitalWrite(M1_S2, s2);
  digitalWrite(M1_S3, s3);
  delay(5);
  uint32_t p = pulseIn(M1_OUT, LOW, 50000);
  return p ? 1000000UL / (2 * p) : 0;   // fréquence en Hz
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("tcs3200_red", m1_red, "Hz", false);
  lab_value("tcs3200_green", m1_green, "Hz", false);
  lab_value("tcs3200_blue", m1_blue, "Hz", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "tcs3200_tcs230_coule";
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
  Serial.println(F("\n# ESP32 LAB — TCS3200 / TCS230 (couleur) — mesure et affichage série"));
  // TCS3200 / TCS230 (couleur) (tcs3200)
  pinMode(M1_S0, OUTPUT); pinMode(M1_S1, OUTPUT);
  pinMode(M1_S2, OUTPUT); pinMode(M1_S3, OUTPUT);
  pinMode(M1_OUT, INPUT);
  digitalWrite(M1_S0, HIGH); digitalWrite(M1_S1, LOW);   // échelle de fréquence 20 %
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // TCS3200 / TCS230 (couleur) (tcs3200) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_red = m1_measure(LOW, LOW);
    m1_blue = m1_measure(LOW, HIGH);
    m1_green = m1_measure(HIGH, HIGH);
    lab_print_m1();
  }
}
