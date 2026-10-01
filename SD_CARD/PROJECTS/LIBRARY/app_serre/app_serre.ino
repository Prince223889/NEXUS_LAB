// ==========================================================================
//  Serre intelligente
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Aération au-dessus de 28 °C, arrosage sous 35 % d'humidité du sol, suivi de la lumière ; tableau de bord web.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit SHT31 Library (2.2.2 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - BH1750 (1.3.0 ou plus récent) — Christopher Laws
//  Câblage :
//    SHT31 VCC                      -> 3V3
//    SHT31 GND                      -> GND
//    SHT31 SDA                      -> GPIO21
//    SHT31 SCL                      -> GPIO22
//    Humidité du sol capacitive v1.2 VCC -> 3V3
//    Humidité du sol capacitive v1.2 GND -> GND
//    Humidité du sol capacitive v1.2 AOUT -> GPIO34
//    BH1750 (GY-30 / GY-302) VCC    -> 3V3
//    BH1750 (GY-30 / GY-302) GND    -> GND
//    BH1750 (GY-30 / GY-302) SDA    -> GPIO21
//    BH1750 (GY-30 / GY-302) SCL    -> GPIO22
//    Module relais 5 V (1 canal) VCC -> 5V (VIN)
//    Module relais 5 V (1 canal) GND -> GND
//    Module relais 5 V (1 canal) IN -> GPIO4
//    Mini-pompe à eau 5 V (via MOSFET) VCC -> 5V (VIN)
//    Mini-pompe à eau 5 V (via MOSFET) GND -> GND
//    Mini-pompe à eau 5 V (via MOSFET) grille MOSFET / IN relais -> GPIO13
//  Points d'attention :
//    ! Consommation de pointe estimée 733 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
//    ! Alimentez Mini-pompe à eau 5 V (via MOSFET) directement en 5 V externe et reliez les masses (GND commun).
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M2_AO 34          // Humidité du sol capacitive v1.2 AOUT
#define M4_IN 4          // Module relais 5 V (1 canal) IN
#define M5_SIG 13         // Mini-pompe à eau 5 V (via MOSFET) grille MOSFET / IN relais

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // SHT31 : période de mesure
static const uint32_t M2_PERIOD_MS = 2000;   // Humidité du sol capacitive v1.2 : période de mesure
static const uint32_t M3_PERIOD_MS = 1000;   // BH1750 (GY-30 / GY-302) : période de mesure
static const uint32_t M4_PERIOD_MS = 5000;   // Module relais 5 V (1 canal) : période de mesure
static const uint32_t M5_PERIOD_MS = 10000;   // Mini-pompe à eau 5 V (via MOSFET) : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "serre_intelligente";

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // SHT31 — Température (°C)
float m1_hum = NAN;                // SHT31 — Humidité (%)
float m2_moist = NAN;              // Humidité du sol capacitive v1.2 — Humidité du sol (%)
float m2_mv = NAN;                 // Humidité du sol capacitive v1.2 — Tension (mV)
float m3_lux = NAN;                // BH1750 (GY-30 / GY-302) — Éclairement (lx)

// ---------- Réseau ----------
WebServer lab_web(80);
WiFiUDP lab_udp;

// ---------- SHT31 (sht31) ----------
bool m1_ok = false;
Adafruit_SHT31 m1_sht(&Wire);

// ---------- Humidité du sol capacitive v1.2 (soil) ----------

// ---------- BH1750 (GY-30 / GY-302) (bh1750) ----------
bool m3_ok = false;
BH1750 m3_meter(0x23);

// ---------- Module relais 5 V (1 canal) (aeration) ----------
bool m4_state = false;
void m4_write(bool on) { m4_state = on; digitalWrite(M4_IN, (true) ? !on : on); }
void m4_on() { m4_write(true); }
void m4_off() { m4_write(false); }
void m4_toggle() { m4_write(!m4_state); }

// ---------- Mini-pompe à eau 5 V (via MOSFET) (pump) ----------
bool m5_state = false;
uint32_t m5_since = 0;
void m5_on() { if (!m5_state) { m5_state = true; m5_since = millis(); digitalWrite(M5_SIG, HIGH); Serial.println(F("# pompe ON")); } }
void m5_off() { if (m5_state) { m5_state = false; digitalWrite(M5_SIG, LOW); Serial.println(F("# pompe OFF")); } }
void m5_toggle() { if (m5_state) m5_off(); else m5_on(); }

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
  lab_value("sht31_temp", m1_temp, "°C", false);
  lab_value("sht31_hum", m1_hum, "%", true);
}
void lab_print_m2() {
  lab_value("soil_moist", m2_moist, "%", false);
  lab_value("soil_mv", m2_mv, "mV", true);
}
void lab_print_m3() {
  lab_value("bh1750_lux", m3_lux, "lx", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : SHT31 Température > 28 °C → Module relais 5 V (1 canal) on
  static int8_t rule1 = -1;
  if (!isnan(m1_temp)) {
    if (rule1 != 1 && m1_temp > 28.0f) { rule1 = 1; m4_on(); }
    else if (rule1 != 0 && m1_temp < 27.0f) { rule1 = 0; m4_off(); }
  }
  // Règle 2 : Humidité du sol capacitive v1.2 Humidité du sol < 35 % → Mini-pompe à eau 5 V (via MOSFET) on
  static int8_t rule2 = -1;
  if (!isnan(m2_moist)) {
    if (rule2 != 1 && m2_moist < 35.0f) { rule2 = 1; m5_on(); }
    else if (rule2 != 0 && m2_moist > 45.0f) { rule2 = 0; m5_off(); }
  }
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
  String j = F("{\"title\":\"Serre intelligente\",\"values\":[");
  j += F("{\"label\":\"SHT31 Température\",\"unit\":\"°C\",\"value\":");
  j += isnan(m1_temp) ? String("null") : String(m1_temp, 3);
  j += "}";
  j += F(",{\"label\":\"SHT31 Humidité\",\"unit\":\"%\",\"value\":");
  j += isnan(m1_hum) ? String("null") : String(m1_hum, 3);
  j += "}";
  j += F(",{\"label\":\"Humidité du sol capacitive v1.2 Humidité du sol\",\"unit\":\"%\",\"value\":");
  j += isnan(m2_moist) ? String("null") : String(m2_moist, 3);
  j += "}";
  j += F(",{\"label\":\"Humidité du sol capacitive v1.2 Tension\",\"unit\":\"mV\",\"value\":");
  j += isnan(m2_mv) ? String("null") : String(m2_mv, 3);
  j += "}";
  j += F(",{\"label\":\"BH1750 (GY-30 / GY-302) Éclairement\",\"unit\":\"lx\",\"value\":");
  j += isnan(m3_lux) ? String("null") : String(m3_lux, 3);
  j += "}";
  j += "]}";
  lab_web.send(200, "application/json", j);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "serre_intelligente";
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
  Serial.println(F("\n# ESP32 LAB — Serre intelligente"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // SHT31 (sht31)
  m1_ok = m1_sht.begin(0x44);
  if (!m1_ok) Serial.println(F("# SHT31 : non détecté — vérifiez le câblage et l'alimentation"));
  // BH1750 (GY-30 / GY-302) (bh1750)
  m3_ok = m3_meter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire);
  if (!m3_ok) Serial.println(F("# BH1750 (GY-30 / GY-302) : non détecté — vérifiez le câblage et l'alimentation"));
  // Module relais 5 V (1 canal) (aeration)
  pinMode(M4_IN, OUTPUT);
  m4_off();
  // Mini-pompe à eau 5 V (via MOSFET) (pump)
  pinMode(M5_SIG, OUTPUT);
  digitalWrite(M5_SIG, LOW);
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
  // SHT31 (sht31) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      m1_temp = m1_sht.readTemperature();
      m1_hum = m1_sht.readHumidity();
      lab_print_m1();
    }
  }
  // Humidité du sol capacitive v1.2 (soil) — toutes les M2_PERIOD_MS
  static uint32_t m2_last = 0;
  if (now - m2_last >= M2_PERIOD_MS) {
    m2_last = now;
    uint32_t s = 0;
    for (int i = 0; i < 16; i++) s += analogReadMilliVolts(M2_AO);
    float mv = s / 16.0f;
    m2_mv = mv;
    m2_moist = constrain(100.0f * (2600 - mv) / (2600 - 1150), 0.0f, 100.0f);
    lab_print_m2();
  }
  // BH1750 (GY-30 / GY-302) (bh1750) — toutes les M3_PERIOD_MS
  static uint32_t m3_last = 0;
  if (now - m3_last >= M3_PERIOD_MS) {
    m3_last = now;
    if (m3_ok) {
      float lx = m3_meter.readLightLevel();
      m3_lux = lx < 0 ? NAN : lx;
      lab_print_m3();
    }
  }
  // Mini-pompe à eau 5 V (via MOSFET) (pump) — à chaque tour
  if (m5_state && millis() - m5_since > 20 * 1000UL) { Serial.println(F("# sécurité : arrêt de la pompe")); m5_off(); }
  lab_rules();
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
  lab_web.handleClient();
}
