// ==========================================================================
//  Prise commandée par télécommande IR
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  La touche « 1 » (commande NEC 0x45) d'une télécommande allume le relais, toute autre touche l'éteint.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - IRremote (4.7.1 ou plus récent) — Armin Joachimsmeyer
//  Câblage :
//    Récepteur infrarouge VS1838B / TSOP38238 VCC -> 3V3
//    Récepteur infrarouge VS1838B / TSOP38238 GND -> GND
//    Récepteur infrarouge VS1838B / TSOP38238 OUT -> GPIO34
//    Module relais 5 V (1 canal) VCC -> 5V (VIN)
//    Module relais 5 V (1 canal) GND -> GND
//    Module relais 5 V (1 canal) IN -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <IRremote.hpp>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_RX 34          // Récepteur infrarouge VS1838B / TSOP38238 OUT
#define M2_IN 4          // Module relais 5 V (1 canal) IN

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // Récepteur infrarouge VS1838B / TSOP38238 : période de mesure
static const uint32_t M2_PERIOD_MS = 5000;   // Module relais 5 V (1 canal) : période de mesure

// ---------- Mesures publiées ----------
float m1_cmd = NAN;                // Récepteur infrarouge VS1838B / TSOP38238 — Dernière commande

// ---------- Récepteur infrarouge VS1838B / TSOP38238 (irrx) ----------

// ---------- Module relais 5 V (1 canal) (relay) ----------
bool m2_state = false;
void m2_write(bool on) { m2_state = on; digitalWrite(M2_IN, (true) ? !on : on); }
void m2_on() { m2_write(true); }
void m2_off() { m2_write(false); }
void m2_toggle() { m2_write(!m2_state); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("irrx_cmd", m1_cmd, "", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : Récepteur infrarouge VS1838B / TSOP38238 Dernière commande == 69 → Module relais 5 V (1 canal) on
  static int8_t rule1 = -1;
  if (!isnan(m1_cmd)) {
    const int8_t st = (m1_cmd == 69.0f) ? 1 : 0;
    if (st != rule1) { rule1 = st; if (st) { m2_on(); } else { m2_off(); } }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "prise_commandee_par_";
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
  Serial.println(F("\n# ESP32 LAB — Prise commandée par télécommande IR"));
  // Récepteur infrarouge VS1838B / TSOP38238 (irrx)
  IrReceiver.begin(M1_RX, DISABLE_LED_FEEDBACK);
  Serial.println(F("# Récepteur IR prêt : appuyez sur une touche de télécommande"));
  // Module relais 5 V (1 canal) (relay)
  pinMode(M2_IN, OUTPUT);
  m2_off();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Récepteur infrarouge VS1838B / TSOP38238 (irrx) — à chaque tour
  if (IrReceiver.decode()) {
    if (!(IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT)) {
      Serial.printf("# IR %s adresse=0x%04X commande=0x%02X\n",
                    getProtocolString(IrReceiver.decodedIRData.protocol),
                    IrReceiver.decodedIRData.address, IrReceiver.decodedIRData.command);
      m1_cmd = IrReceiver.decodedIRData.command;
    }
    IrReceiver.resume();
  }
  // Récepteur infrarouge VS1838B / TSOP38238 (irrx) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    lab_print_m1();
  }
  lab_rules();
}
