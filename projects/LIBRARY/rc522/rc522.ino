// ==========================================================================
//  Lecteur RFID RC522 (13,56 MHz) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Lit l'identifiant (UID) des badges et cartes MIFARE : contrôle d'accès, pointeuse.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - MFRC522 (1.4.12 ou plus récent) — GithubCommunity
//  Câblage :
//    Lecteur RFID RC522 (13,56 MHz) VCC -> 3V3
//    Lecteur RFID RC522 (13,56 MHz) GND -> GND
//    Lecteur RFID RC522 (13,56 MHz) SCK -> GPIO18
//    Lecteur RFID RC522 (13,56 MHz) MISO -> GPIO19
//    Lecteur RFID RC522 (13,56 MHz) MOSI -> GPIO23
//    Lecteur RFID RC522 (13,56 MHz) SDA (SS) -> GPIO4
//    Lecteur RFID RC522 (13,56 MHz) RST -> GPIO13
// ==========================================================================
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_SPI_SCK 18
#define LAB_SPI_MISO 19
#define LAB_SPI_MOSI 23
#define M1_SS 4          // Lecteur RFID RC522 (13,56 MHz) SDA (SS)
#define M1_RST 13         // Lecteur RFID RC522 (13,56 MHz) RST

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 100;   // Lecteur RFID RC522 (13,56 MHz) : période de mesure

// ---------- Mesures publiées ----------
float m1_granted = NAN;            // Lecteur RFID RC522 (13,56 MHz) — Dernier accès (0/1)
float m1_reads = NAN;              // Lecteur RFID RC522 (13,56 MHz) — Lectures

// ---------- Lecteur RFID RC522 (13,56 MHz) (rfid) ----------
MFRC522 m1_rfid(M1_SS, M1_RST);
uint32_t m1_n = 0;
uint32_t m1_readAt = 0;
String m1_uidString(const MFRC522::Uid &u) {
  String s;
  for (byte i = 0; i < u.size; i++) {
    if (i) s += ' ';
    if (u.uidByte[i] < 0x10) s += '0';
    s += String(u.uidByte[i], HEX);
  }
  s.toUpperCase();
  return s;
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
bool lab_changed(float v, float &prev) {
  const bool same = (v == prev) || (isnan(v) && isnan(prev));
  prev = v;
  return !same;
}
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("rfid_granted", m1_granted, "", false);
  lab_value("rfid_reads", m1_reads, "", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "lecteur_rfid_rc522_1";
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
  Serial.println(F("\n# ESP32 LAB — Lecteur RFID RC522 (13,56 MHz) — mesure et affichage série"));
  SPI.begin(LAB_SPI_SCK, LAB_SPI_MISO, LAB_SPI_MOSI);
  // Lecteur RFID RC522 (13,56 MHz) (rfid)
  m1_rfid.PCD_Init();
  delay(5);
  Serial.print(F("# RC522 version : "));
  m1_rfid.PCD_DumpVersionToSerial();
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Lecteur RFID RC522 (13,56 MHz) (rfid) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (!isnan(m1_granted) && millis() - m1_readAt > 1500) m1_granted = NAN;   // prêt pour le badge suivant
    if (m1_rfid.PICC_IsNewCardPresent() && m1_rfid.PICC_ReadCardSerial()) {
      m1_readAt = millis();
      String uid = m1_uidString(m1_rfid.uid);
      bool ok = uid == String("DE AD BE EF");
      Serial.printf("# badge %s : %s\n", uid.c_str(), ok ? "AUTORISÉ" : "refusé");
      m1_granted = ok ? 1 : 0;
      m1_reads = ++m1_n;
      m1_rfid.PICC_HaltA();
      m1_rfid.PCD_StopCrypto1();
    }
    static float m1_prev[2];
    static uint32_t m1_printed = 0;
    bool m1_ch = false;
    m1_ch |= lab_changed(m1_granted, m1_prev[0]);
    m1_ch |= lab_changed(m1_reads, m1_prev[1]);
    if (m1_ch || now - m1_printed >= 5000) { m1_printed = now; lab_print_m1(); }
  }
}
