// ==========================================================================
//  Radio nRF24L01+ (2,4 GHz) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Liaison radio bas coût entre cartes (100 m, 1000 m en version PA+LNA) : envoie un compteur et écoute les réponses.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - RF24 (1.6.2 ou plus récent) — TMRh20
//  Câblage :
//    Radio nRF24L01+ (2,4 GHz) VCC  -> 3V3
//    Radio nRF24L01+ (2,4 GHz) GND  -> GND
//    Radio nRF24L01+ (2,4 GHz) SCK  -> GPIO18
//    Radio nRF24L01+ (2,4 GHz) MISO -> GPIO19
//    Radio nRF24L01+ (2,4 GHz) MOSI -> GPIO23
//    Radio nRF24L01+ (2,4 GHz) CE   -> GPIO13
//    Radio nRF24L01+ (2,4 GHz) CSN  -> GPIO4
// ==========================================================================
#include <Arduino.h>
#include <SPI.h>
#include <RF24.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_SPI_SCK 18
#define LAB_SPI_MISO 19
#define LAB_SPI_MOSI 23
#define M1_CE 13          // Radio nRF24L01+ (2,4 GHz) CE
#define M1_CSN 4         // Radio nRF24L01+ (2,4 GHz) CSN

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 2000;   // Radio nRF24L01+ (2,4 GHz) : période de mesure

// ---------- Mesures publiées ----------
float m1_tx = NAN;                 // Radio nRF24L01+ (2,4 GHz) — Envoyé
float m1_rx = NAN;                 // Radio nRF24L01+ (2,4 GHz) — Reçu

// ---------- Radio nRF24L01+ (2,4 GHz) (nrf) ----------
bool m1_ok = false;
RF24 m1_radio(M1_CE, M1_CSN);
const uint8_t m1_addr[6] = "LAB01";
uint32_t m1_counter = 0;

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("nrf_tx", m1_tx, "", false);
  lab_value("nrf_rx", m1_rx, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "radio_nrf24l01_2_4_g";
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
  Serial.println(F("\n# ESP32 LAB — Radio nRF24L01+ (2,4 GHz) — mesure et affichage série"));
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // Radio nRF24L01+ (2,4 GHz) (nrf)
  m1_ok = m1_radio.begin();
  if (m1_ok) {
    m1_radio.setPALevel(RF24_PA_LOW);
    if (0 == 0) { m1_radio.openWritingPipe(m1_addr); m1_radio.stopListening(); }
    else { m1_radio.openReadingPipe(1, m1_addr); m1_radio.startListening(); }
  }
  if (!m1_ok) Serial.println(F("# Radio nRF24L01+ (2,4 GHz) : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Radio nRF24L01+ (2,4 GHz) (nrf) — à chaque tour
  if (m1_ok) {
    if (0 == 1 && m1_radio.available()) {
      uint32_t v;
      m1_radio.read(&v, sizeof(v));
      Serial.printf("# nRF24 reçu : %lu\n", (unsigned long)v);
      m1_rx = v;
    }
  }
  // Radio nRF24L01+ (2,4 GHz) (nrf) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      if (0 == 0) {
        m1_counter++;
        bool sent = m1_radio.write(&m1_counter, sizeof(m1_counter));
        Serial.printf("# nRF24 envoi %lu : %s\n", (unsigned long)m1_counter, sent ? "acquitté" : "échec");
        m1_tx = m1_counter;
      }
      lab_print_m1();
    }
  }
}
