// ==========================================================================
//  Compteur d'énergie domestique
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Tension, courant, puissance, kWh et facteur de puissance, publiés en web, MQTT et vers le MASTER.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - PZEM004Tv30 (1.2.1 ou plus récent) — Jakub Mandula
//    - Adafruit SSD1306 (2.5.17 ou plus récent) — Adafruit
//    - Adafruit GFX Library (1.12.6 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - PubSubClient (2.8 ou plus récent)
//  Câblage :
//    PZEM-004T v3 (compteur d'énergie) VCC -> 5V (VIN)
//    PZEM-004T v3 (compteur d'énergie) GND -> GND
//    PZEM-004T v3 (compteur d'énergie) TX du PZEM -> GPIO16
//    PZEM-004T v3 (compteur d'énergie) RX du PZEM -> GPIO17
//    Écran OLED 0,96" SSD1306 128×64 (I2C) VCC -> 3V3
//    Écran OLED 0,96" SSD1306 128×64 (I2C) GND -> GND
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SDA -> GPIO21
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SCL -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <PZEM004Tv30.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>
#include <PubSubClient.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M1_RX 16          // PZEM-004T v3 (compteur d'énergie) TX du PZEM
#define M1_TX 17          // PZEM-004T v3 (compteur d'énergie) RX du PZEM

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // PZEM-004T v3 (compteur d'énergie) : période de mesure
static const uint32_t M2_PERIOD_MS = 2000;   // Écran OLED 0,96" SSD1306 128×64 (I2C) : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "compteur_d_energie_d";
static const char *LAB_MQTT_HOST = "192.168.4.2";

// ---------- Mesures publiées ----------
float m1_volt = NAN;               // PZEM-004T v3 (compteur d'énergie) — Tension (V)
float m1_curr = NAN;               // PZEM-004T v3 (compteur d'énergie) — Courant (A)
float m1_power = NAN;              // PZEM-004T v3 (compteur d'énergie) — Puissance (W)
float m1_energy = NAN;             // PZEM-004T v3 (compteur d'énergie) — Énergie (kWh)
float m1_freq = NAN;               // PZEM-004T v3 (compteur d'énergie) — Fréquence (Hz)
float m1_pf = NAN;                 // PZEM-004T v3 (compteur d'énergie) — Facteur de puissance

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Tension", "V", &m1_volt},
  {"Courant", "A", &m1_curr},
  {"Puissance", "W", &m1_power},
  {"Énergie", "kWh", &m1_energy},
  {"Fréquence", "Hz", &m1_freq},
  {"Facteur de puissance", "", &m1_pf}
};
const int LAB_OUT_COUNT = 6;

// ---------- Réseau ----------
WebServer lab_web(80);
WiFiUDP lab_udp;
WiFiClient lab_net;
PubSubClient lab_mqtt(lab_net);

// ---------- PZEM-004T v3 (compteur d'énergie) (pzem) ----------
PZEM004Tv30 m1_pzem(Serial2, M1_RX, M1_TX);

// ---------- Écran OLED 0,96" SSD1306 128×64 (I2C) (oled) ----------
bool m2_ok = false;
Adafruit_SSD1306 m2_d(128, 64, &Wire, -1);
String m2_ascii(const char *s) {
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
String m2_line(int i) {
  char v[20];
  float x = lab_outs[i].value ? *lab_outs[i].value : NAN;
  if (isnan(x)) strcpy(v, "--");
  else if (fabsf(x) >= 1000) snprintf(v, sizeof(v), "%.0f", x);
  else snprintf(v, sizeof(v), "%.1f", x);
  return m2_ascii(lab_outs[i].label) + ": " + v + " " + m2_ascii(lab_outs[i].unit);
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_send_master(const char *key, float v, const char *unit) {
  if (WiFi.status() != WL_CONNECTED || isnan(v)) return;
  lab_udp.beginPacket(IPAddress(192, 168, 4, 1), 4213);
  lab_udp.printf("LAB|%s|%s|%.3f|%s\n", LAB_DEVICE, key, v, unit);
  lab_udp.endPacket();
}
void lab_send_mqtt(const char *key, float v) {
  if (!lab_mqtt.connected() || isnan(v)) return;
  char topic[80], payload[24];
  snprintf(topic, sizeof(topic), "lab/%s/%s", LAB_DEVICE, key);
  snprintf(payload, sizeof(payload), "%.3f", v);
  lab_mqtt.publish(topic, payload);
}
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  lab_send_master(key, v, unit);
  lab_send_mqtt(key, v);
}
void lab_print_m1() {
  lab_value("pzem_volt", m1_volt, "V", false);
  lab_value("pzem_curr", m1_curr, "A", false);
  lab_value("pzem_power", m1_power, "W", false);
  lab_value("pzem_energy", m1_energy, "kWh", false);
  lab_value("pzem_freq", m1_freq, "Hz", false);
  lab_value("pzem_pf", m1_pf, "", true);
}

// ---------- Tableau de bord web ----------
static const char LAB_PAGE[] PROGMEM = R"HTML(<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ESP32 LAB</title><style>
:root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;padding:16px;background:Canvas;color:CanvasText}
h1{font-size:18px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.c{border:1px solid color-mix(in srgb,CanvasText 15%,transparent);border-radius:10px;padding:12px}.k{font-size:12px;opacity:.7}.v{font-size:24px;font-weight:650}
</style></head><body><h1 id="t">ESP32 LAB</h1><div class="g" id="g"></div><script>
async function r(){try{const d=await (await fetch("/api")).json();document.getElementById("t").textContent=d.title;
document.getElementById("g").innerHTML=d.values.map(v=>`<div class=c><div class=k>${v.label}</div><div class=v>${v.value===null?"—":v.value.toFixed(2)} <small>${v.unit}</small></div></div>`).join("")}catch(e){}}
r();setInterval(r,2000)</script></body></html>)HTML";

void lab_web_api() {
  String j = F("{\"title\":\"Compteur d'énergie domestique\",\"values\":[");
  j += F("{\"label\":\"PZEM-004T v3 (compteur d'énergie) Tension\",\"unit\":\"V\",\"value\":");
  j += isnan(m1_volt) ? String("null") : String(m1_volt, 3);
  j += "}";
  j += F(",{\"label\":\"PZEM-004T v3 (compteur d'énergie) Courant\",\"unit\":\"A\",\"value\":");
  j += isnan(m1_curr) ? String("null") : String(m1_curr, 3);
  j += "}";
  j += F(",{\"label\":\"PZEM-004T v3 (compteur d'énergie) Puissance\",\"unit\":\"W\",\"value\":");
  j += isnan(m1_power) ? String("null") : String(m1_power, 3);
  j += "}";
  j += F(",{\"label\":\"PZEM-004T v3 (compteur d'énergie) Énergie\",\"unit\":\"kWh\",\"value\":");
  j += isnan(m1_energy) ? String("null") : String(m1_energy, 3);
  j += "}";
  j += F(",{\"label\":\"PZEM-004T v3 (compteur d'énergie) Fréquence\",\"unit\":\"Hz\",\"value\":");
  j += isnan(m1_freq) ? String("null") : String(m1_freq, 3);
  j += "}";
  j += F(",{\"label\":\"PZEM-004T v3 (compteur d'énergie) Facteur de puissance\",\"unit\":\"\",\"value\":");
  j += isnan(m1_pf) ? String("null") : String(m1_pf, 3);
  j += "}";
  j += "]}";
  lab_web.send(200, "application/json", j);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "compteur_d_energie_d";
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
  Serial.println(F("\n# ESP32 LAB — Compteur d'énergie domestique"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // Écran OLED 0,96" SSD1306 128×64 (I2C) (oled)
  m2_ok = m2_d.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (m2_ok) { m2_d.cp437(true); m2_d.clearDisplay(); m2_d.display(); }
  if (!m2_ok) Serial.println(F("# Écran OLED 0,96\" SSD1306 128×64 (I2C) : non détecté — vérifiez le câblage et l'alimentation"));
  // Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(LAB_WIFI_SSID, LAB_WIFI_PASS);
  Serial.print(F("# Wi-Fi"));
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(250); Serial.print("."); }
  if (WiFi.status() == WL_CONNECTED) Serial.printf("\n# Connecté : http://%s/\n", WiFi.localIP().toString().c_str());
  else Serial.println(F("\n# Wi-Fi indisponible : nouvelle tentative automatique"));
  lab_web.on("/", []() { lab_web.send_P(200, "text/html; charset=utf-8", LAB_PAGE); });
  lab_web.on("/api", lab_web_api);
  lab_web.begin();
  lab_udp.begin(4214);
  lab_mqtt.setServer(LAB_MQTT_HOST, 1883);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // PZEM-004T v3 (compteur d'énergie) (pzem) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_volt = m1_pzem.voltage();
    m1_curr = m1_pzem.current();
    m1_power = m1_pzem.power();
    m1_energy = m1_pzem.energy();
    m1_freq = m1_pzem.frequency();
    m1_pf = m1_pzem.pf();
    lab_print_m1();
  }
  // Écran OLED 0,96" SSD1306 128×64 (I2C) (oled) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    if (m2_ok) {
      m2_d.clearDisplay();
      m2_d.setTextSize(1);
      m2_d.setTextColor(SSD1306_WHITE);
      m2_d.setCursor(0, 0);
      m2_d.println(F("ESP32 LAB"));
      if (LAB_OUT_COUNT == 0) {
        m2_d.printf("Uptime %lus\n", (unsigned long)(millis() / 1000));
        m2_d.printf("RAM %luk\n", (unsigned long)(ESP.getFreeHeap() / 1024));
      } else {
        static int page = 0;
        const int per = 6;
        int pages = (LAB_OUT_COUNT + per - 1) / per;
        if (page >= pages) page = 0;
        for (int i = page * per; i < LAB_OUT_COUNT && i < (page + 1) * per; i++) m2_d.println(m2_line(i));
        page++;
      }
      m2_d.display();
    }
  }
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
  lab_web.handleClient();
  if (WiFi.status() == WL_CONNECTED && !lab_mqtt.connected()) {
    static uint32_t mqtt_retry = 0;
    if (now - mqtt_retry > 5000) { mqtt_retry = now; lab_mqtt.connect(LAB_DEVICE); }
  }
  lab_mqtt.loop();
}
