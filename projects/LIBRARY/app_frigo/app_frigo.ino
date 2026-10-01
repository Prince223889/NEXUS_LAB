// ==========================================================================
//  Alarme de réfrigérateur / congélateur
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Bip si la température dépasse 8 °C (porte mal fermée, panne) ; valeur envoyée au MASTER.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - OneWire (2.3.8 ou plus récent) — Paul Stoffregen
//    - DallasTemperature (4.0.6 ou plus récent) — Miles Burton
//  Câblage :
//    DS18B20 VCC                    -> 3V3
//    DS18B20 GND                    -> GND
//    DS18B20 DATA                   -> GPIO4   (résistance de tirage 4,7 kΩ entre DATA et 3V3 obligatoire)
//    Buzzer actif 5 V VCC           -> 3V3
//    Buzzer actif 5 V GND           -> GND
//    Buzzer actif 5 V + (via transistor si > 20 mA) -> GPIO13
// ==========================================================================
#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_DATA 4        // DS18B20 DATA
#define M2_IO 13          // Buzzer actif 5 V + (via transistor si > 20 mA)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // DS18B20 : période de mesure
static const uint32_t M2_PERIOD_MS = 2000;   // Buzzer actif 5 V : période de mesure
static const char *LAB_WIFI_SSID = "ESP32-LAB";      // point d'accès du MASTER ESP32 LAB par défaut
static const char *LAB_WIFI_PASS = "ESP32-LAB-Setup2026!";
[[maybe_unused]] static const char *LAB_DEVICE = "alarme_de_refrigerat";

// ---------- Mesures publiées ----------
float m1_temp = NAN;               // DS18B20 — Température (°C)

// ---------- Réseau ----------
WiFiUDP lab_udp;

// ---------- DS18B20 (ds18b20) ----------
bool m1_ok = false;
OneWire m1_wire(M1_DATA);
DallasTemperature m1_sensors(&m1_wire);

// ---------- Buzzer actif 5 V (buzz) ----------
bool m2_state = false;
void m2_on() { m2_state = true; digitalWrite(M2_IO, HIGH); }
void m2_off() { m2_state = false; digitalWrite(M2_IO, LOW); }
void m2_toggle() { if (m2_state) m2_off(); else m2_on(); }

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
  lab_value("ds18b20_temp", m1_temp, "°C", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : DS18B20 Température > 8 °C → Buzzer actif 5 V on
  static int8_t rule1 = -1;
  if (!isnan(m1_temp)) {
    if (rule1 != 1 && m1_temp > 8.0f) { rule1 = 1; m2_on(); }
    else if (rule1 != 0 && m1_temp < 7.0f) { rule1 = 0; m2_off(); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "alarme_de_refrigerat";
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
  Serial.println(F("\n# ESP32 LAB — Alarme de réfrigérateur / congélateur"));
  // DS18B20 (ds18b20)
  m1_sensors.begin();
  m1_sensors.setWaitForConversion(false);  // mesure non bloquante
  m1_ok = m1_sensors.getDeviceCount() > 0;
  Serial.printf("# DS18B20 : %u sonde(s) détectée(s)\n", m1_sensors.getDeviceCount());
  m1_sensors.requestTemperatures();
  if (!m1_ok) Serial.println(F("# DS18B20 : non détecté — vérifiez le câblage et l'alimentation"));
  // Buzzer actif 5 V (buzz)
  pinMode(M2_IO, OUTPUT);
  m2_off();
  // Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(LAB_WIFI_SSID, LAB_WIFI_PASS);
  Serial.print(F("# Wi-Fi"));
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(250); Serial.print("."); }
  if (WiFi.status() == WL_CONNECTED) Serial.printf("\n# Connecté : http://%s/\n", WiFi.localIP().toString().c_str());
  else Serial.println(F("\n# Wi-Fi indisponible : nouvelle tentative automatique"));
  lab_udp.begin(4214);
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
  lab_rules();
  // Reconnexion Wi-Fi
  static uint32_t wifi_retry = 0;
  if (WiFi.status() != WL_CONNECTED && now - wifi_retry > 15000) { wifi_retry = now; WiFi.reconnect(); }
}
