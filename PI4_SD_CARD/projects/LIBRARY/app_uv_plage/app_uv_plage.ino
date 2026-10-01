// ==========================================================================
//  Alerte UV plage
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Indice UV sur OLED et bip au-dessus de l'indice 6 (protection solaire).
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit LTR390 Library (1.1.2 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - Adafruit SSD1306 (2.5.17 ou plus récent) — Adafruit
//    - Adafruit GFX Library (1.12.6 ou plus récent) — Adafruit
//  Câblage :
//    LTR390 (UV + lumière) VCC      -> 3V3
//    LTR390 (UV + lumière) GND      -> GND
//    LTR390 (UV + lumière) SDA      -> GPIO21
//    LTR390 (UV + lumière) SCL      -> GPIO22
//    Buzzer actif 5 V VCC           -> 3V3
//    Buzzer actif 5 V GND           -> GND
//    Buzzer actif 5 V + (via transistor si > 20 mA) -> GPIO4
//    Écran OLED 0,96" SSD1306 128×64 (I2C) VCC -> 3V3
//    Écran OLED 0,96" SSD1306 128×64 (I2C) GND -> GND
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SDA -> GPIO21
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SCL -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_LTR390.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M2_IO 4          // Buzzer actif 5 V + (via transistor si > 20 mA)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // LTR390 (UV + lumière) : période de mesure
static const uint32_t M2_PERIOD_MS = 2000;   // Buzzer actif 5 V : période de mesure
static const uint32_t M3_PERIOD_MS = 2000;   // Écran OLED 0,96" SSD1306 128×64 (I2C) : période de mesure

// ---------- Mesures publiées ----------
float m1_uvi = NAN;                // LTR390 (UV + lumière) — Indice UV
float m1_uvs = NAN;                // LTR390 (UV + lumière) — UVS brut

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Indice UV", "", &m1_uvi},
  {"UVS brut", "", &m1_uvs}
};
const int LAB_OUT_COUNT = 2;

// ---------- LTR390 (UV + lumière) (ltr390) ----------
bool m1_ok = false;
Adafruit_LTR390 m1_ltr;

// ---------- Buzzer actif 5 V (buzz) ----------
bool m2_state = false;
void m2_on() { m2_state = true; digitalWrite(M2_IO, HIGH); }
void m2_off() { m2_state = false; digitalWrite(M2_IO, LOW); }
void m2_toggle() { if (m2_state) m2_off(); else m2_on(); }

// ---------- Écran OLED 0,96" SSD1306 128×64 (I2C) (oled) ----------
bool m3_ok = false;
Adafruit_SSD1306 m3_d(128, 64, &Wire, -1);
String m3_ascii(const char *s) {
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
String m3_line(int i) {
  char v[20];
  float x = lab_outs[i].value ? *lab_outs[i].value : NAN;
  if (isnan(x)) strcpy(v, "--");
  else if (fabsf(x) >= 1000) snprintf(v, sizeof(v), "%.0f", x);
  else snprintf(v, sizeof(v), "%.1f", x);
  return m3_ascii(lab_outs[i].label) + ": " + v + " " + m3_ascii(lab_outs[i].unit);
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("ltr390_uvi", m1_uvi, "", false);
  lab_value("ltr390_uvs", m1_uvs, "", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : LTR390 (UV + lumière) Indice UV > 6 → Buzzer actif 5 V on
  static int8_t rule1 = -1;
  if (!isnan(m1_uvi)) {
    if (rule1 != 1 && m1_uvi > 6.0f) { rule1 = 1; m2_on(); }
    else if (rule1 != 0 && m1_uvi < 5.5f) { rule1 = 0; m2_off(); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "alerte_uv_plage";
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
  Serial.println(F("\n# ESP32 LAB — Alerte UV plage"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // LTR390 (UV + lumière) (ltr390)
  m1_ok = m1_ltr.begin(&Wire);
  if (m1_ok) { m1_ltr.setMode(LTR390_MODE_UVS); m1_ltr.setGain(LTR390_GAIN_18); m1_ltr.setResolution(LTR390_RESOLUTION_20BIT); }
  if (!m1_ok) Serial.println(F("# LTR390 (UV + lumière) : non détecté — vérifiez le câblage et l'alimentation"));
  // Buzzer actif 5 V (buzz)
  pinMode(M2_IO, OUTPUT);
  m2_off();
  // Écran OLED 0,96" SSD1306 128×64 (I2C) (oled)
  m3_ok = m3_d.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (m3_ok) { m3_d.cp437(true); m3_d.clearDisplay(); m3_d.display(); }
  if (!m3_ok) Serial.println(F("# Écran OLED 0,96\" SSD1306 128×64 (I2C) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // LTR390 (UV + lumière) (ltr390) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      if (m1_ltr.newDataAvailable()) {
        m1_uvs = m1_ltr.readUVS();
        m1_uvi = m1_uvs / 2300.0f;          // sensibilité typique à gain 18x / 20 bits
      }
      lab_print_m1();
    }
  }
  // Écran OLED 0,96" SSD1306 128×64 (I2C) (oled) — toutes les M3_PERIOD_MS
  static uint32_t m3_last = 0;
  if (now - m3_last >= M3_PERIOD_MS) {
    m3_last = now;
    if (m3_ok) {
      m3_d.clearDisplay();
      m3_d.setTextSize(1);
      m3_d.setTextColor(SSD1306_WHITE);
      m3_d.setCursor(0, 0);
      m3_d.println(F("ESP32 LAB"));
      if (LAB_OUT_COUNT == 0) {
        m3_d.printf("Uptime %lus\n", (unsigned long)(millis() / 1000));
        m3_d.printf("RAM %luk\n", (unsigned long)(ESP.getFreeHeap() / 1024));
      } else {
        static int page = 0;
        const int per = 6;
        int pages = (LAB_OUT_COUNT + per - 1) / per;
        if (page >= pages) page = 0;
        for (int i = page * per; i < LAB_OUT_COUNT && i < (page + 1) * per; i++) m3_d.println(m3_line(i));
        page++;
      }
      m3_d.display();
    }
  }
  lab_rules();
}
