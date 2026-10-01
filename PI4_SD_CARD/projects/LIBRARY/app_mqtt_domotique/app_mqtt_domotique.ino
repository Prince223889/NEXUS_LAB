// ==========================================================================
//  Capteur domotique MQTT (Home Assistant)
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Température/humidité et relais publiés sur un broker MQTT (Mosquitto, Home Assistant).
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - Adafruit SHT31 Library (2.2.2 ou plus récent) — Adafruit
//    - Adafruit BusIO (1.17.4 ou plus récent) — Adafruit
//    - PubSubClient (2.8 ou plus récent)
//  Câblage :
//    SHT31 VCC                      -> 3V3
//    SHT31 GND                      -> GND
//    SHT31 SDA                      -> GPIO21
//    SHT31 SCL                      -> GPIO22
//    Module relais 5 V (1 canal) VCC -> 5V (VIN)
//    Module relais 5 V (1 canal) GND -> GND
//    Module relais 5 V (1 canal) IN -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>
#include <PubSubClient.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M2_IN 4          // Module relais 5 V (1 canal) IN

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // SHT31 : période de mesure
static const uint32_t M2_PERIOD_MS = 5000;   // Module relais 5 V (1 canal) : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "capteur_domotique_mq";
static const char *LAB_MQTT_HOST = "192.168.4.2";

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // SHT31 — Température (°C)
float m1_hum = NAN;                // SHT31 — Humidité (%)

// ---------- Réseau ----------
WebServer lab_web(80);
WiFiClient lab_net;
PubSubClient lab_mqtt(lab_net);

// ---------- SHT31 (sht31) ----------
bool m1_ok = false;
Adafruit_SHT31 m1_sht(&Wire);

// ---------- Module relais 5 V (1 canal) (relay) ----------
bool m2_state = false;
void m2_write(bool on) { m2_state = on; digitalWrite(M2_IN, (true) ? !on : on); }
void m2_on() { m2_write(true); }
void m2_off() { m2_write(false); }
void m2_toggle() { m2_write(!m2_state); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
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
  lab_send_mqtt(key, v);
  (void)unit;
}
void lab_print_m1() {
  lab_value("sht31_temp", m1_temp, "°C", false);
  lab_value("sht31_hum", m1_hum, "%", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : SHT31 Humidité > 70 % → Module relais 5 V (1 canal) on
  static int8_t rule1 = -1;
  if (!isnan(m1_hum)) {
    if (rule1 != 1 && m1_hum > 70.0f) { rule1 = 1; m2_on(); }
    else if (rule1 != 0 && m1_hum < 65.0f) { rule1 = 0; m2_off(); }
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
  String j = F("{\"title\":\"Capteur domotique MQTT (Home Assistant)\",\"values\":[");
  j += F("{\"label\":\"SHT31 Température\",\"unit\":\"°C\",\"value\":");
  j += isnan(m1_temp) ? String("null") : String(m1_temp, 3);
  j += "}";
  j += F(",{\"label\":\"SHT31 Humidité\",\"unit\":\"%\",\"value\":");
  j += isnan(m1_hum) ? String("null") : String(m1_hum, 3);
  j += "}";
  j += "]}";
  lab_web.send(200, "application/json", j);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "capteur_domotique_mq";
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
  Serial.println(F("\n# ESP32 LAB — Capteur domotique MQTT (Home Assistant)"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // SHT31 (sht31)
  m1_ok = m1_sht.begin(0x44);
  if (!m1_ok) Serial.println(F("# SHT31 : non détecté — vérifiez le câblage et l'alimentation"));
  // Module relais 5 V (1 canal) (relay)
  pinMode(M2_IN, OUTPUT);
  m2_off();
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
  lab_mqtt.setServer(LAB_MQTT_HOST, 1883);
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
  lab_rules();
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
