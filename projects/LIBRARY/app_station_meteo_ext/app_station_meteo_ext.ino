// ==========================================================================
//  Station météo extérieure complète
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Kit météo : température/humidité, vitesse et direction du vent, cumul de pluie, détecteur de pluie, avec page web.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - DHT sensor library (1.4.7 ou plus récent) — Adafruit
//    - Adafruit Unified Sensor (1.1.15 ou plus récent) — Adafruit
//  Câblage :
//    DHT22 / AM2302 VCC             -> 3V3
//    DHT22 / AM2302 GND             -> GND
//    DHT22 / AM2302 DATA            -> GPIO4   (résistance de tirage 10 kΩ vers 3V3 (souvent déjà sur le module))
//    Anémomètre à impulsions VCC    -> 3V3
//    Anémomètre à impulsions GND    -> GND
//    Anémomètre à impulsions fil 1  -> GPIO13   (fil 2 vers GND)
//    Girouette à résistances VCC    -> 3V3
//    Girouette à résistances GND    -> GND
//    Girouette à résistances fil 1  -> GPIO34   (10 kΩ entre 3V3 et le point de mesure, fil 2 vers GND)
//    Pluviomètre à auget VCC        -> 3V3
//    Pluviomètre à auget GND        -> GND
//    Pluviomètre à auget fil 1      -> GPIO14   (fil 2 vers GND)
//    Capteur de pluie FC-37 / YL-83 VCC -> 3V3
//    Capteur de pluie FC-37 / YL-83 GND -> GND
//    Capteur de pluie FC-37 / YL-83 AO -> GPIO35
//    Capteur de pluie FC-37 / YL-83 DO -> GPIO36
// ==========================================================================
#include <Arduino.h>
#include <DHT.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_DATA 4        // DHT22 / AM2302 DATA
#define M2_PULSE 13       // Anémomètre à impulsions fil 1
#define M3_AO 34          // Girouette à résistances fil 1
#define M4_PULSE 14       // Pluviomètre à auget fil 1
#define M5_AO 35          // Capteur de pluie FC-37 / YL-83 AO
#define M5_DO 36          // Capteur de pluie FC-37 / YL-83 DO

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2500;   // DHT22 / AM2302 : période de mesure
static const uint32_t M2_PERIOD_MS = 3000;   // Anémomètre à impulsions : période de mesure
static const uint32_t M3_PERIOD_MS = 2000;   // Girouette à résistances : période de mesure
static const uint32_t M4_PERIOD_MS = 10000;   // Pluviomètre à auget : période de mesure
static const uint32_t M5_PERIOD_MS = 1000;   // Capteur de pluie FC-37 / YL-83 : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "station_meteo_exteri";

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // DHT22 / AM2302 — Température (°C)
float m1_hum = NAN;                // DHT22 / AM2302 — Humidité (%)
float m2_speed = NAN;              // Anémomètre à impulsions — Vitesse du vent (km/h)
float m3_deg = NAN;                // Girouette à résistances — Direction (0 = nord) (°)
float m4_total = NAN;              // Pluviomètre à auget — Cumul de pluie (mm)
float m5_wet = NAN;                // Capteur de pluie FC-37 / YL-83 — Humidité plaque (%)
float m5_rain = NAN;               // Capteur de pluie FC-37 / YL-83 — Pluie (0/1)

// ---------- Réseau ----------
WebServer lab_web(80);
WiFiUDP lab_udp;

// ---------- DHT22 / AM2302 (dht22) ----------
DHT m1_dht(M1_DATA, DHT22);

// ---------- Anémomètre à impulsions (wind) ----------
volatile uint32_t m2_pulses = 0;
volatile uint32_t m2_lastUs = 0;
void IRAM_ATTR m2_isr() {
  uint32_t t = micros();
  if (t - m2_lastUs > 5000) { m2_pulses = m2_pulses + 1; m2_lastUs = t; }   // anti-rebond 5 ms
}

// ---------- Girouette à résistances (vane) ----------
const float m3_R[16] = {33000, 6570, 8200, 891, 1000, 688, 2200, 1410, 3900, 3140, 16000, 14120, 120000, 42120, 64900, 21880};
float m3_dir(float mv) {
  int best = 0;
  float err = 1e9;
  for (int i = 0; i < 16; i++) {
    float expect = 3300.0f * m3_R[i] / (m3_R[i] + 10000.0f);
    if (fabs(expect - mv) < err) { err = fabs(expect - mv); best = i; }
  }
  return best * 22.5f;
}

// ---------- Pluviomètre à auget (pluvio) ----------
volatile uint32_t m4_tips = 0;
volatile uint32_t m4_lastMs = 0;
void IRAM_ATTR m4_isr() {
  uint32_t t = millis();
  if (t - m4_lastMs > 200) { m4_tips = m4_tips + 1; m4_lastMs = t; }
}

// ---------- Capteur de pluie FC-37 / YL-83 (rain) ----------

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_send_master(const char *key, float v, const char *unit) {
  if (WiFi.status() != WL_CONNECTED || isnan(v)) return;
  lab_udp.beginPacket(IPAddress(192, 168, 4, 1), 4213);
  lab_udp.printf("LAB|%s|%s|%.3f|%s\n", LAB_DEVICE, key, v, unit);
  lab_udp.endPacket();
}
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  lab_send_master(key, v, unit);
}
void lab_print_m1() {
  lab_value("dht22_temp", m1_temp, "°C", false);
  lab_value("dht22_hum", m1_hum, "%", true);
}
void lab_print_m2() {
  lab_value("wind_speed", m2_speed, "km/h", true);
}
void lab_print_m3() {
  lab_value("vane_deg", m3_deg, "°", true);
}
void lab_print_m4() {
  lab_value("pluvio_total", m4_total, "mm", true);
}
void lab_print_m5() {
  lab_value("rain_wet", m5_wet, "%", false);
  lab_value("rain_rain", m5_rain, "", true);
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
  String j = F("{\"title\":\"Station météo extérieure complète\",\"values\":[");
  j += F("{\"label\":\"DHT22 / AM2302 Température\",\"unit\":\"°C\",\"value\":");
  j += isnan(m1_temp) ? String("null") : String(m1_temp, 3);
  j += "}";
  j += F(",{\"label\":\"DHT22 / AM2302 Humidité\",\"unit\":\"%\",\"value\":");
  j += isnan(m1_hum) ? String("null") : String(m1_hum, 3);
  j += "}";
  j += F(",{\"label\":\"Anémomètre à impulsions Vitesse du vent\",\"unit\":\"km/h\",\"value\":");
  j += isnan(m2_speed) ? String("null") : String(m2_speed, 3);
  j += "}";
  j += F(",{\"label\":\"Girouette à résistances Direction (0 = nord)\",\"unit\":\"°\",\"value\":");
  j += isnan(m3_deg) ? String("null") : String(m3_deg, 3);
  j += "}";
  j += F(",{\"label\":\"Pluviomètre à auget Cumul de pluie\",\"unit\":\"mm\",\"value\":");
  j += isnan(m4_total) ? String("null") : String(m4_total, 3);
  j += "}";
  j += F(",{\"label\":\"Capteur de pluie FC-37 / YL-83 Humidité plaque\",\"unit\":\"%\",\"value\":");
  j += isnan(m5_wet) ? String("null") : String(m5_wet, 3);
  j += "}";
  j += F(",{\"label\":\"Capteur de pluie FC-37 / YL-83 Pluie (0/1)\",\"unit\":\"\",\"value\":");
  j += isnan(m5_rain) ? String("null") : String(m5_rain, 3);
  j += "}";
  j += "]}";
  lab_web.send(200, "application/json", j);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "station_meteo_exteri";
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
  Serial.println(F("\n# ESP32 LAB — Station météo extérieure complète"));
  // DHT22 / AM2302 (dht22)
  m1_dht.begin();
  // Anémomètre à impulsions (wind)
  pinMode(M2_PULSE, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(M2_PULSE), m2_isr, FALLING);
  // Pluviomètre à auget (pluvio)
  pinMode(M4_PULSE, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(M4_PULSE), m4_isr, FALLING);
  // Capteur de pluie FC-37 / YL-83 (rain)
  if (M5_DO >= 0) pinMode(M5_DO, INPUT);
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
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // DHT22 / AM2302 (dht22) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    m1_temp = m1_dht.readTemperature();
    m1_hum = m1_dht.readHumidity();
    lab_print_m1();
  }
  // Anémomètre à impulsions (wind) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    noInterrupts();
    uint32_t n = m2_pulses;
    m2_pulses = 0;
    interrupts();
    m2_speed = n * 2.4 * 1000.0f / M2_PERIOD_MS;
    lab_print_m2();
  }
  // Girouette à résistances (vane) — toutes les M3_PERIOD_MS
  static uint32_t m3_last = 0;
  if (now - m3_last >= M3_PERIOD_MS) {
    m3_last = now;
    m3_deg = m3_dir(analogReadMilliVolts(M3_AO));
    lab_print_m3();
  }
  // Pluviomètre à auget (pluvio) — toutes les M4_PERIOD_MS
  static uint32_t m4_last = 0;
  if (now - m4_last >= M4_PERIOD_MS) {
    m4_last = now;
    m4_total = m4_tips * 0.2794;
    lab_print_m4();
  }
  // Capteur de pluie FC-37 / YL-83 (rain) — toutes les M5_PERIOD_MS
  static uint32_t m5_last = 0;
  if (now - m5_last >= M5_PERIOD_MS) {
    m5_last = now;
    int mv = analogReadMilliVolts(M5_AO);
    m5_wet = constrain(map(mv, 3300, 800, 0, 100), 0, 100);    // 0 % sec, 100 % très mouillé
    if (M5_DO >= 0) m5_rain = digitalRead(M5_DO) == LOW ? 1 : 0;
    lab_print_m5();
  }
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
  lab_web.handleClient();
}
