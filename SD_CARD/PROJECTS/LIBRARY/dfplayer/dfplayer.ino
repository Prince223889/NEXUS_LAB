// ==========================================================================
//  Lecteur MP3 DFPlayer Mini — mesure et affichage série
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Lit des fichiers MP3 depuis une microSD vers un haut-parleur 3 W : annonces vocales, alarme sonore.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - DFRobotDFPlayerMini (1.0.5 ou plus récent) — DFRobot
//  Câblage :
//    Lecteur MP3 DFPlayer Mini VCC  -> 5V (VIN)
//    Lecteur MP3 DFPlayer Mini GND  -> GND
//    Lecteur MP3 DFPlayer Mini TX du DFPlayer -> GPIO16
//    Lecteur MP3 DFPlayer Mini RX du DFPlayer (via 1 kΩ) -> GPIO17
//    Lecteur MP3 DFPlayer Mini SPK1 / SPK2 -> haut-parleur 4-8 Ω, 3 W max
//  Points d'attention :
//    ! Alimentez Lecteur MP3 DFPlayer Mini directement en 5 V externe et reliez les masses (GND commun).
// ==========================================================================
#include <Arduino.h>
#include <DFRobotDFPlayerMini.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define M1_RX 16          // Lecteur MP3 DFPlayer Mini TX du DFPlayer
#define M1_TX 17          // Lecteur MP3 DFPlayer Mini RX du DFPlayer (via 1 kΩ)

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 15000;   // Lecteur MP3 DFPlayer Mini : période de mesure

// ---------- Lecteur MP3 DFPlayer Mini (mp3) ----------
bool m1_ok = false;
DFRobotDFPlayerMini m1_mp3;
uint8_t m1_track = 1;
void m1_set(float vol) { m1_mp3.volume((uint8_t)constrain(vol, 0.0f, 30.0f)); }
void m1_on() { m1_mp3.play(1); }
void m1_off() { m1_mp3.stop(); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "lecteur_mp3_dfplayer";
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
  Serial.println(F("\n# ESP32 LAB — Lecteur MP3 DFPlayer Mini — mesure et affichage série"));
  // Lecteur MP3 DFPlayer Mini (mp3)
  Serial2.begin(9600, SERIAL_8N1, M1_RX, M1_TX);
  m1_ok = m1_mp3.begin(Serial2, true, true);
  if (m1_ok) m1_mp3.volume(18);
  if (!m1_ok) Serial.println(F("# Lecteur MP3 DFPlayer Mini : non détecté — vérifiez le câblage et l'alimentation"));
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // Lecteur MP3 DFPlayer Mini (mp3) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      m1_mp3.play(m1_track);
      Serial.printf("# lecture de la piste %u\n", m1_track);
      m1_track = m1_track % 3 + 1;
    }
  }
}
