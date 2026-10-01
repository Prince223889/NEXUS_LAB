// ==========================================================================
//  Modem GSM SIM800L (SMS, appels) — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Modem 2G : envoie des SMS d'alerte, mesure la qualité du réseau (commandes AT).
// --------------------------------------------------------------------------
//  Aucune bibliothèque externe : tout est inclus dans le cœur ESP32.
//  Câblage :
//    Modem GSM SIM800L (SMS, appels) VCC -> 3V3   (3,7-4,2 V / 2 A (batterie Li-ion), PAS le 3V3 de l'ESP32)
//    Modem GSM SIM800L (SMS, appels) GND -> GND
//    Modem GSM SIM800L (SMS, appels) TXD du SIM800L -> GPIO16
//    Modem GSM SIM800L (SMS, appels) RXD du SIM800L -> GPIO17
//  Points d'attention :
//    ! Consommation de pointe estimée 2080 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
// ==========================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_RX 16          // Modem GSM SIM800L (SMS, appels) TXD du SIM800L
#define M1_TX 17          // Modem GSM SIM800L (SMS, appels) RXD du SIM800L

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 10000;   // Modem GSM SIM800L (SMS, appels) : période de mesure

// ---------- Mesures publiées ----------
float m1_csq = NAN;                // Modem GSM SIM800L (SMS, appels) — Qualité (0-31)
float m1_dbm = NAN;                // Modem GSM SIM800L (SMS, appels) — Signal (dBm)

// ---------- Modem GSM SIM800L (SMS, appels) (gsm) ----------
String m1_at(const char *cmd, uint32_t wait = 800) {
  while (Serial2.available()) Serial2.read();
  Serial2.println(cmd);
  String r;
  uint32_t t = millis();
  while (millis() - t < wait) while (Serial2.available()) r += (char)Serial2.read();
  return r;
}

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("gsm_csq", m1_csq, "", false);
  lab_value("gsm_dbm", m1_dbm, "dBm", true);
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "modem_gsm_sim800l_sm";
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
  Serial.println(F("\n# ESP32 LAB — Modem GSM SIM800L (SMS, appels) — mesure et affichage série"));
  // Modem GSM SIM800L (SMS, appels) (gsm)
  Serial2.begin(9600, SERIAL_8N1, M1_RX, M1_TX);
  delay(1000);
  Serial.printf("# SIM800L : %s\n", m1_at("AT").indexOf("OK") >= 0 ? "OK" : "pas de réponse");
  m1_at("AT+CMGF=1");                 // SMS en mode texte
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Modem GSM SIM800L (SMS, appels) (gsm) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    String r = m1_at("AT+CSQ");
    int p = r.indexOf("+CSQ: ");
    if (p >= 0) {
      int q = r.substring(p + 6).toInt();
      m1_csq = q;
      m1_dbm = (q == 99) ? NAN : -113 + 2 * q;
    }
    lab_print_m1();
  }
}
