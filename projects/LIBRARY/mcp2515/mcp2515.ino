// ==========================================================================
//  Bus CAN MCP2515 + TJA1050 — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Contrôleur CAN 500 kbit/s : envoie une trame de test et affiche le trafic du bus.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - mcp_can (1.5.1 ou plus récent) — coryjfowler
//  Câblage :
//    Bus CAN MCP2515 + TJA1050 VCC  -> 5V (VIN)
//    Bus CAN MCP2515 + TJA1050 GND  -> GND
//    Bus CAN MCP2515 + TJA1050 SCK  -> GPIO18
//    Bus CAN MCP2515 + TJA1050 MISO -> GPIO19
//    Bus CAN MCP2515 + TJA1050 MOSI -> GPIO23
//    Bus CAN MCP2515 + TJA1050 CS   -> GPIO4
//    Bus CAN MCP2515 + TJA1050 INT  -> GPIO34
// ==========================================================================
#include <Arduino.h>
#include <SPI.h>
#include <mcp_can.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_SPI_SCK 18
#define LAB_SPI_MISO 19
#define LAB_SPI_MOSI 23
#define M1_CS 4          // Bus CAN MCP2515 + TJA1050 CS
#define M1_INT 34         // Bus CAN MCP2515 + TJA1050 INT

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // Bus CAN MCP2515 + TJA1050 : période de mesure

// ---------- Mesures publiées ----------
float m1_sendOk = NAN;             // Bus CAN MCP2515 + TJA1050 — Envoi OK

// ---------- Bus CAN MCP2515 + TJA1050 (can) ----------
bool m1_ok = false;
MCP_CAN m1_can(M1_CS);
uint8_t m1_cnt = 0;

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("can_sendok", m1_sendOk, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "bus_can_mcp2515_tja1";
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
  Serial.println(F("\n# ESP32 LAB — Bus CAN MCP2515 + TJA1050 — mesure et affichage série"));
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // Bus CAN MCP2515 + TJA1050 (can)
  m1_ok = m1_can.begin(MCP_ANY, CAN_500KBPS, MCP_8MHZ) == CAN_OK;
  if (m1_ok) m1_can.setMode(MCP_NORMAL);
  pinMode(M1_INT, INPUT);
  if (!m1_ok) Serial.println(F("# Bus CAN MCP2515 + TJA1050 : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Bus CAN MCP2515 + TJA1050 (can) — à chaque tour
  if (m1_ok) {
    if (!digitalRead(M1_INT)) {
      unsigned long id; uint8_t len; uint8_t buf[8];
      if (m1_can.readMsgBuf(&id, &len, buf) == CAN_OK) {
        Serial.printf("# CAN 0x%03lX [%u]", id & 0x1FFFFFFF, len);
        for (uint8_t i = 0; i < len; i++) Serial.printf(" %02X", buf[i]);
        Serial.println();
      }
    }
  }
  // Bus CAN MCP2515 + TJA1050 (can) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      uint8_t data[8] = {'L', 'A', 'B', m1_cnt++, 0, 0, 0, 0};
      m1_sendOk = (m1_can.sendMsgBuf(0x123, 0, 8, data) == CAN_OK) ? 1 : 0;
      lab_print_m1();
    }
  }
}
