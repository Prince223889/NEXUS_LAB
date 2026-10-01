// ==========================================================================
//  LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Radio longue portée (plusieurs km) : envoie un paquet périodique et affiche les paquets reçus avec le RSSI.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - LoRa (0.8.0 ou plus récent) — Sandeep Mistry
//  Câblage :
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) VCC -> 3V3
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) GND -> GND
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) SCK -> GPIO18
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) MISO -> GPIO19
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) MOSI -> GPIO23
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) NSS -> GPIO4
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) RST -> GPIO13
//    LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) DIO0 -> GPIO34
// ==========================================================================
#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_SPI_SCK 18
#define LAB_SPI_MISO 19
#define LAB_SPI_MOSI 23
#define M1_NSS 4         // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) NSS
#define M1_RST 13         // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) RST
#define M1_DIO0 34        // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) DIO0

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 10000;   // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) : période de mesure

// ---------- Mesures publiées ----------
float m1_sent = NAN;               // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) — Paquets envoyés
float m1_rssi = NAN;               // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) — RSSI dernier reçu (dBm)

// ---------- Table des mesures (afficheurs) ----------
struct LabOut { const char *label; const char *unit; float *value; };
LabOut lab_outs[] = {
  {"Paquets envoyés", "", &m1_sent},
  {"RSSI dernier reçu", "dBm", &m1_rssi}
};
const int LAB_OUT_COUNT = 2;

// ---------- LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora) ----------
bool m1_ok = false;
uint32_t m1_n = 0;

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("lora_sent", m1_sent, "", false);
  lab_value("lora_rssi", m1_rssi, "dBm", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "lora_sx1276_sx1278_r";
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
  Serial.println(F("\n# ESP32 LAB — LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) — mesure et affichage série"));
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora)
  LoRa.setPins(M1_NSS, M1_RST, M1_DIO0);
  m1_ok = LoRa.begin(868E6);
  if (m1_ok) { LoRa.setSpreadingFactor(9); LoRa.setSyncWord(0x4C); }
  if (!m1_ok) Serial.println(F("# LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora) — à chaque tour
  if (m1_ok) {
    int size = LoRa.parsePacket();
    if (size) {
      String msg;
      while (LoRa.available()) msg += (char)LoRa.read();
      Serial.printf("# LoRa reçu (%d dBm) : %s\n", LoRa.packetRssi(), msg.c_str());
      m1_rssi = LoRa.packetRssi();
    }
  }
  // LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) (lora) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      LoRa.beginPacket();
      LoRa.printf("LAB;%lu", (unsigned long)++m1_n);
      for (int i = 0; i < LAB_OUT_COUNT; i++) {                 // toutes les mesures du projet
        float v = lab_outs[i].value ? *lab_outs[i].value : NAN;
        if (!isnan(v) && lab_outs[i].value != &m1_sent && lab_outs[i].value != &m1_rssi) LoRa.printf(";%s=%.2f", lab_outs[i].label, v);
      }
      LoRa.endPacket();
      m1_sent = m1_n;
      lab_print_m1();
    }
  }
}
