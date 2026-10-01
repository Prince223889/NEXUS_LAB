// ==========================================================================
//  Écran LCD 20×4 + module I2C — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Grand écran texte 4 lignes de 20 caractères.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - LiquidCrystal I2C (1.1.2 ou plus récent) — Frank de Brabander
//  Câblage :
//    Écran LCD 20×4 + module I2C VCC -> 5V (VIN)
//    Écran LCD 20×4 + module I2C GND -> GND
//    Écran LCD 20×4 + module I2C SDA -> GPIO21
//    Écran LCD 20×4 + module I2C SCL -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // Écran LCD 20×4 + module I2C : période de mesure

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[1] = {{"", "", nullptr}};
const int LAB_OUT_COUNT = 0;

// ---------- Écran LCD 20×4 + module I2C (lcd2004) ----------
LiquidCrystal_I2C m1_d(0x27, 20, 4);
String m1_ascii(const char *s) {
  String o;
  const uint8_t *p = (const uint8_t *)s;
  while (*p) {
    uint8_t c = *p++;
    if (c < 0x80) { o += (char)c; continue; }
    uint8_t d = *p ? *p++ : 0;
    if (c == 0xC2 && d == 0xB0) o += (char)0xDF;                 // °
    else if ((c == 0xC2 && d == 0xB5) || (c == 0xCE && d == 0xBC)) o += 'u';   // µ
    else if (c == 0xC2 && d == 0xB2) o += '2';
    else if (c == 0xC2 && d == 0xB3) o += '3';
    else if (c == 0xC3) {
      if (d >= 0xA0 && d <= 0xA5) o += 'a'; else if (d == 0xA7) o += 'c'; else if (d >= 0xA8 && d <= 0xAB) o += 'e';
      else if (d >= 0xAC && d <= 0xAF) o += 'i'; else if (d >= 0xB2 && d <= 0xB6) o += 'o'; else if (d >= 0xB9 && d <= 0xBC) o += 'u';
      else if (d >= 0x80 && d <= 0x85) o += 'A'; else if (d == 0x87) o += 'C'; else if (d >= 0x88 && d <= 0x8B) o += 'E';
      else o += '?';
    } else if (c == 0xE2 && d == 0x82 && *p) { uint8_t e = *p++; o += (char)('0' + (e & 0x0F)); }   // ₀-₉
    else { while (*p && (*p & 0xC0) == 0x80) p++; o += '?'; }
  }
  return o;
}
String m1_line(int i) {
  char v[20];
  float x = lab_outs[i].value ? *lab_outs[i].value : NAN;
  if (isnan(x)) strcpy(v, "--");
  else if (fabsf(x) >= 1000) snprintf(v, sizeof(v), "%.0f", x);
  else snprintf(v, sizeof(v), "%.1f", x);
  return m1_ascii(lab_outs[i].label) + ": " + v + " " + m1_ascii(lab_outs[i].unit);
}

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
static const char *LAB_PROJECT = "ecran_lcd_20_4_modul";
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
  Serial.println(F("\n# ESP32 LAB — Écran LCD 20×4 + module I2C — mesure et affichage série"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // Écran LCD 20×4 + module I2C (lcd2004)
  m1_d.init();
  m1_d.backlight();
  m1_d.clear();
  m1_d.print("ESP32 LAB");
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Écran LCD 20×4 + module I2C (lcd2004) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_d.clear();
    if (LAB_OUT_COUNT == 0) {
      m1_d.setCursor(0, 0); m1_d.print("ESP32 LAB");
      m1_d.setCursor(0, 1); m1_d.printf("Uptime %lus", (unsigned long)(millis() / 1000));
    } else {
      static int page = 0;
      int pages = (LAB_OUT_COUNT + 4 - 1) / 4;
      if (page >= pages) page = 0;
      for (int r = 0; r < 4; r++) {
        int i = page * 4 + r;
        if (i >= LAB_OUT_COUNT) break;
        m1_d.setCursor(0, r);
        m1_d.print(m1_line(i).substring(0, 20));
      }
      page++;
    }
  }
}
