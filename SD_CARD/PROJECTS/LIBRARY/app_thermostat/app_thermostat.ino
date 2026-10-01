// ==========================================================================
//  Thermostat de chauffage
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Enclenche un radiateur (via relais) sous 19 °C avec hystérésis de 0,5 °C ; affichage OLED.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - OneWire (2.3.8 ou plus récent) — Paul Stoffregen
//    - DallasTemperature (4.0.6 ou plus récent) — Miles Burton
//    - Adafruit SSD1306 (2.5.17 ou plus récent) — Adafruit
//    - Adafruit GFX Library (1.12.6 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//  Câblage :
//    DS18B20 VCC                    -> 3V3
//    DS18B20 GND                    -> GND
//    DS18B20 DATA                   -> GPIO4   (résistance de tirage 4,7 kΩ entre DATA et 3V3 obligatoire)
//    Module relais 5 V (1 canal) VCC -> 5V (VIN)
//    Module relais 5 V (1 canal) GND -> GND
//    Module relais 5 V (1 canal) IN -> GPIO13
//    Écran OLED 0,96" SSD1306 128×64 (I2C) VCC -> 3V3
//    Écran OLED 0,96" SSD1306 128×64 (I2C) GND -> GND
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SDA -> GPIO21
//    Écran OLED 0,96" SSD1306 128×64 (I2C) SCL -> GPIO22
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M1_DATA 4        // DS18B20 DATA
#define M2_IN 13          // Module relais 5 V (1 canal) IN

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // DS18B20 : période de mesure
static const uint32_t M2_PERIOD_MS = 5000;   // Module relais 5 V (1 canal) : période de mesure
static const uint32_t M3_PERIOD_MS = 2000;   // Écran OLED 0,96" SSD1306 128×64 (I2C) : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "thermostat_de_chauff";

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // DS18B20 — Température (°C)

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Température", "°C", &m1_temp}
};
const int LAB_OUT_COUNT = 1;

// ---------- Réseau ----------
WebServer lab_web(80);

// ---------- DS18B20 (ds18b20) ----------
bool m1_ok = false;
OneWire m1_wire(M1_DATA);
DallasTemperature m1_sensors(&m1_wire);

// ---------- Module relais 5 V (1 canal) (chauffage) ----------
bool m2_state = false;
void m2_write(bool on) { m2_state = on; digitalWrite(M2_IN, (true) ? !on : on); }
void m2_on() { m2_write(true); }
void m2_off() { m2_write(false); }
void m2_toggle() { m2_write(!m2_state); }

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
  lab_value("ds18b20_temp", m1_temp, "°C", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : DS18B20 Température < 19 °C → Module relais 5 V (1 canal) on
  static int8_t rule1 = -1;
  if (!isnan(m1_temp)) {
    if (rule1 != 1 && m1_temp < 19.0f) { rule1 = 1; m2_on(); }
    else if (rule1 != 0 && m1_temp > 19.5f) { rule1 = 0; m2_off(); }
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
  String j = F("{\"title\":\"Thermostat de chauffage\",\"values\":[");
  j += F("{\"label\":\"DS18B20 Température\",\"unit\":\"°C\",\"value\":");
  j += isnan(m1_temp) ? String("null") : String(m1_temp, 3);
  j += "}";
  j += "]}";
  lab_web.send(200, "application/json", j);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "thermostat_de_chauff";
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
  Serial.println(F("\n# ESP32 LAB — Thermostat de chauffage"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // DS18B20 (ds18b20)
  m1_sensors.begin();
  m1_sensors.setWaitForConversion(false);  // mesure non bloquante
  m1_ok = m1_sensors.getDeviceCount() > 0;
  Serial.printf("# DS18B20 : %u sonde(s) détectée(s)\n", m1_sensors.getDeviceCount());
  m1_sensors.requestTemperatures();
  if (!m1_ok) Serial.println(F("# DS18B20 : non détecté — vérifiez le câblage et l'alimentation"));
  // Module relais 5 V (1 canal) (chauffage)
  pinMode(M2_IN, OUTPUT);
  m2_off();
  // Écran OLED 0,96" SSD1306 128×64 (I2C) (oled)
  m3_ok = m3_d.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (m3_ok) { m3_d.cp437(true); m3_d.clearDisplay(); m3_d.display(); }
  if (!m3_ok) Serial.println(F("# Écran OLED 0,96\" SSD1306 128×64 (I2C) : non détecté — vérifiez le câblage et l'alimentation"));
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
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // DS18B20 (ds18b20) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      float t = m1_sensors.getTempCByIndex(0);
      m1_temp = (t == DEVICE_DISCONNECTED_C) ? NAN : t;
      m1_sensors.requestTemperatures();  // lance la conversion suivante (750 ms)
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
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
  lab_web.handleClient();
}
