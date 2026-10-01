// ==========================================================================
//  Volet roulant automatique
//  Généré par ESP32 LAB Studio 6.1.0 — carte : ESP32 DevKit V1 (WROOM-32)
//  Arduino IDE : carte « ESP32 Dev Module », cœur « esp32 by Espressif » 3.3.x, moniteur 115200 bauds.
//  Ouvre un store (moteur pas-à-pas) au-dessus de 2000 lx et le referme la nuit.
// --------------------------------------------------------------------------
//  Bibliothèques à installer (Croquis > Inclure une bibliothèque > Gérer) :
//    - BH1750 (1.3.0 ou plus récent) — Christopher Laws
//    - AccelStepper (1.64 ou plus récent) — Mike McCauley
//  Câblage :
//    BH1750 (GY-30 / GY-302) VCC    -> 3V3
//    BH1750 (GY-30 / GY-302) GND    -> GND
//    BH1750 (GY-30 / GY-302) SDA    -> GPIO21
//    BH1750 (GY-30 / GY-302) SCL    -> GPIO22
//    Moteur pas-à-pas 28BYJ-48 + ULN2003 VCC -> 5V (VIN)
//    Moteur pas-à-pas 28BYJ-48 + ULN2003 GND -> GND
//    Moteur pas-à-pas 28BYJ-48 + ULN2003 IN1 -> GPIO4
//    Moteur pas-à-pas 28BYJ-48 + ULN2003 IN2 -> GPIO13
//    Moteur pas-à-pas 28BYJ-48 + ULN2003 IN3 -> GPIO14
//    Moteur pas-à-pas 28BYJ-48 + ULN2003 IN4 -> GPIO16
//  Points d'attention :
//    ! Alimentez Moteur pas-à-pas 28BYJ-48 + ULN2003 directement en 5 V externe et reliez les masses (GND commun).
// ==========================================================================
#include <Arduino.h>
#include <Wire.h>
#include <BH1750.h>
#include <AccelStepper.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <esp_ota_ops.h>

// ---------- Broches ----------
#define LAB_I2C_SDA 21
#define LAB_I2C_SCL 22
#define M2_IN1 4         // Moteur pas-à-pas 28BYJ-48 + ULN2003 IN1
#define M2_IN2 13         // Moteur pas-à-pas 28BYJ-48 + ULN2003 IN2
#define M2_IN3 14         // Moteur pas-à-pas 28BYJ-48 + ULN2003 IN3
#define M2_IN4 16         // Moteur pas-à-pas 28BYJ-48 + ULN2003 IN4

// ---------- Réglages ----------
static const uint32_t M1_PERIOD_MS = 1000;   // BH1750 (GY-30 / GY-302) : période de mesure
static const uint32_t M2_PERIOD_MS = 4000;   // Moteur pas-à-pas 28BYJ-48 + ULN2003 : période de mesure

// ---------- Mesures publiées ----------
float m1_lux = NAN;                // BH1750 (GY-30 / GY-302) — Éclairement (lx)

// ---------- BH1750 (GY-30 / GY-302) (bh1750) ----------
bool m1_ok = false;
BH1750 m1_meter(0x23);

// ---------- Moteur pas-à-pas 28BYJ-48 + ULN2003 (store) ----------
AccelStepper m2_motor(AccelStepper::HALF4WIRE, M2_IN1, M2_IN3, M2_IN2, M2_IN4);   // ordre IN1-IN3-IN2-IN4 obligatoire
void m2_set(float steps) { m2_motor.moveTo((long)steps); }
void m2_on() { m2_motor.moveTo(2048); }       // demi-tour
void m2_off() { m2_motor.moveTo(0); }

// ---------- Publication (moniteur / traceur série, réseau) ----------
void lab_value(const char *key, float v, const char *unit, bool last) {
  // Format « nom:valeur » compris par le Traceur série de l'IDE Arduino
  if (!isnan(v)) Serial.printf("%s:%.2f", key, v);
  Serial.print(last ? "\n" : "\t");
  (void)unit;
}
void lab_print_m1() {
  lab_value("bh1750_lux", m1_lux, "lx", true);
}

// ---------- Automatismes ----------
void lab_rules() {
  static uint32_t last = 0;
  if (millis() - last < 200) return;
  last = millis();
  // Règle 1 : BH1750 (GY-30 / GY-302) Éclairement > 2000 lx → Moteur pas-à-pas 28BYJ-48 + ULN2003 set 4096
  static int8_t rule1 = -1;
  if (!isnan(m1_lux)) {
    if (rule1 != 1 && m1_lux > 2000.0f) { rule1 = 1; m2_set(4096.0f); }
    else if (rule1 != 0 && m1_lux < 1500.0f) { rule1 = 0; m2_set(0.0f); }
  }
}

// ---------- Retour au mode worker ESP32 LAB ----------
// Si ce programme a été chargé sur un worker depuis le MASTER, le programme worker reste dans
// l'autre partition : BOOT maintenu 3 s ou « Revenir au mode worker » sur le tableau de bord le relance.
// Téléversé par câble depuis l'IDE, ce bloc reste inactif.
#define LAB_BOOT_PIN 0
static const char *LAB_PROJECT = "volet_roulant_automa";
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
  Serial.println(F("\n# ESP32 LAB — Volet roulant automatique"));
  Wire.begin(LAB_I2C_SDA, LAB_I2C_SCL);
  // BH1750 (GY-30 / GY-302) (bh1750)
  m1_ok = m1_meter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire);
  if (!m1_ok) Serial.println(F("# BH1750 (GY-30 / GY-302) : non détecté — vérifiez le câblage et l'alimentation"));
  // Moteur pas-à-pas 28BYJ-48 + ULN2003 (store)
  m2_motor.setMaxSpeed(900);
  m2_motor.setAcceleration(400);
  lab_home_begin();
}

void loop() {
  const uint32_t now = millis();
  (void)now;  // utilisé seulement par certains modules
  lab_home_loop();
  // BH1750 (GY-30 / GY-302) (bh1750) — toutes les M1_PERIOD_MS
  static uint32_t m1_last = 0;
  if (now - m1_last >= M1_PERIOD_MS) {
    m1_last = now;
    if (m1_ok) {
      float lx = m1_meter.readLightLevel();
      m1_lux = lx < 0 ? NAN : lx;
      lab_print_m1();
    }
  }
  // Moteur pas-à-pas 28BYJ-48 + ULN2003 (store) — à chaque tour
  m2_motor.run();
  if (m2_motor.distanceToGo() == 0) m2_motor.disableOutputs();
  else m2_motor.enableOutputs();
  lab_rules();
}
