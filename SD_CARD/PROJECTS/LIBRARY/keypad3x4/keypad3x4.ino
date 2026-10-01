// ==========================================================================
//  Clavier matriciel 3×4 (téléphone) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Clavier matriciel 4×3 : saisie de code PIN, menu, calculatrice.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Keypad (3.1.1 ou plus récent) — Mark Stanley, Alexander Brevig
//  Câblage :
//    Clavier matriciel 3×4 (téléphone) VCC -> 3V3
//    Clavier matriciel 3×4 (téléphone) GND -> GND
//    Clavier matriciel 3×4 (téléphone) ligne 1 -> GPIO4
//    Clavier matriciel 3×4 (téléphone) ligne 2 -> GPIO13
//    Clavier matriciel 3×4 (téléphone) ligne 3 -> GPIO14
//    Clavier matriciel 3×4 (téléphone) ligne 4 -> GPIO16
//    Clavier matriciel 3×4 (téléphone) colonne 1 -> GPIO17
//    Clavier matriciel 3×4 (téléphone) colonne 2 -> GPIO25
//    Clavier matriciel 3×4 (téléphone) colonne 3 -> GPIO26
// ==========================================================================
#include <Arduino.h>
#include <Keypad.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_R1 4          // Clavier matriciel 3×4 (téléphone) ligne 1
#define M1_R2 13          // Clavier matriciel 3×4 (téléphone) ligne 2
#define M1_R3 14          // Clavier matriciel 3×4 (téléphone) ligne 3
#define M1_R4 16          // Clavier matriciel 3×4 (téléphone) ligne 4
#define M1_C1 17          // Clavier matriciel 3×4 (téléphone) colonne 1
#define M1_C2 25          // Clavier matriciel 3×4 (téléphone) colonne 2
#define M1_C3 26          // Clavier matriciel 3×4 (téléphone) colonne 3

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // Clavier matriciel 3×4 (téléphone) : période de mesure

// ---------- Clavier matriciel 3×4 (téléphone) (keypad3x4) ----------
char m1_keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{'*','0','#'}};
byte m1_rowPins[4] = {M1_R1, M1_R2, M1_R3, M1_R4};
byte m1_colPins[3] = {M1_C1, M1_C2, M1_C3};
Keypad m1_pad = Keypad(makeKeymap(m1_keys), m1_rowPins, m1_colPins, 4, 3);
String m1_code = "";

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "clavier_matriciel_3_";
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
  Serial.println(F("\n# ESP32 LAB — Clavier matriciel 3×4 (téléphone) — mesure et affichage série"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Clavier matriciel 3×4 (téléphone) (keypad3x4) — à chaque tour
  char k = m1_pad.getKey();
  if (k) {
    if (k == '#') { Serial.printf("# code saisi : %s\n", m1_code.c_str()); m1_code = ""; }
    else if (k == '*') { m1_code = ""; Serial.println(F("# effacé")); }
    else { m1_code += k; Serial.printf("# touche %c\n", k); }
  }
}
