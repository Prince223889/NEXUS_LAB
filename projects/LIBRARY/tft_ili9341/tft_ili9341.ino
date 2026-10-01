// ==========================================================================
//  Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Grand écran couleur 320×240 : tableau de bord lisible de loin.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit ILI9341 (1.6.4 ou plus récent) — Adafruit
//    - Adafruit GFX Library (1.12.6 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//  Câblage :
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) VCC -> 3V3
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) GND -> GND
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) SCK -> GPIO18
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) SDA/MOSI -> GPIO23
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) SDO/MISO -> GPIO19
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) CS -> GPIO4
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) DC -> GPIO13
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) RESET -> GPIO14
//    Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) LED -> 3V3 via 10-47 Ω
// ==========================================================================
#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_SPI_SCK 18
#define LAB_SPI_MISO 19
#define LAB_SPI_MOSI 23
#define M1_CS 4          // Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) CS
#define M1_DC 13          // Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) DC
#define M1_RST 14         // Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) RESET

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) : période de mesure

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[1] = {{"", "", nullptr}};
const int LAB_OUT_COUNT = 0;

// ---------- Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) (ili9341) ----------
Adafruit_ILI9341 m1_d(M1_CS, M1_DC, M1_RST);
String m1_ascii(const char *s) {
  String o;
  const uint8_t *p = (const uint8_t *)s;
  while (*p) {
    uint8_t c = *p++;
    if (c < 0x80) { o += (char)c; continue; }
    uint8_t d = *p ? *p++ : 0;
    if (c == 0xC2 && d == 0xB0) o += (char)248;                 // °
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
static const char *LAB_PROJECT = "ecran_couleur_tft_2_";
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
  Serial.println(F("\n# ESP32 LAB — Écran couleur TFT 2,4/2,8 ILI9341 320×240 (SPI) — mesure et affichage série"));
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) (ili9341)
  m1_d.begin();
  m1_d.setRotation(1);
  m1_d.cp437(true);
  m1_d.fillScreen(ILI9341_BLACK);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) (ili9341) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_d.fillScreen(ILI9341_BLACK);
    m1_d.setTextSize(2);
    m1_d.setTextColor(ILI9341_YELLOW);
    m1_d.setCursor(0, 0);
    m1_d.println(F("ESP32 LAB"));
    if (LAB_OUT_COUNT == 0) {
      m1_d.printf("Uptime %lus\n", (unsigned long)(millis() / 1000));
      m1_d.printf("RAM %luk\n", (unsigned long)(ESP.getFreeHeap() / 1024));
    } else {
      static int page = 0;
      const int per = 9;
      int pages = (LAB_OUT_COUNT + per - 1) / per;
      if (page >= pages) page = 0;
      for (int i = page * per; i < LAB_OUT_COUNT && i < (page + 1) * per; i++) m1_d.println(m1_line(i));
      page++;
    }
  }
}
