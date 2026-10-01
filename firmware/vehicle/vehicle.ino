/* NEXUS — firmware véhicule (Arduino-ESP32 3.3.x, ESP32 / ESP32-S3).
 *
 * Fait d'un worker ESP32 monté sur une voiture un véhicule pilotable par le superviseur de flotte du Pi
 * (pi/patricia/fleet.py), protocole NXV1 authentifié (HMAC-SHA256), voir pi/patricia/fleet_net.py.
 *
 * Sécurités embarquées, indépendantes du Wi-Fi et du Pi :
 *   1. bail (dead-man) : chaque ordre est valable au plus MAX_LEASE_MS ; sans renouvellement, moteurs coupés ;
 *   2. obstacle : le HC-SR04 avant coupe l'avance sous OBSTACLE_STOP_MM ;
 *   3. bouton d'arrêt d'urgence local verrouillé (relâché uniquement par un redémarrage) ;
 *   4. trame mal signée, rejouée ou d'un autre démarrage : ignorée ;
 *   5. perte du Wi-Fi : moteurs coupés immédiatement.
 * Un coupe-circuit physique sur la batterie reste indispensable.
 *
 * NON TESTÉ SUR MATÉRIEL : à valider roues en l'air, puis à basse vitesse, une voiture à la fois.
 * Bibliothèques : uniquement le cœur esp32 (WiFi, WiFiUdp, mbedtls).
 */
#include <WiFi.h>
#include <WiFiUdp.h>
#include <math.h>
#include "mbedtls/md.h"
#include "config.h"

static const uint16_t CMD_PORT = 4230, TELEMETRY_PORT = 4231;

WiFiUDP udp;
IPAddress piAddr;
bool piKnown = false;
char nonce[9];
uint32_t txSeq = 0, rxSeq = 0;

// État et ordre courant
enum Mode { M_STOP, M_GOTO, M_DRIVE };
volatile Mode mode = M_STOP;
float tgtX = 0, tgtY = 0, vmax = 0.2f, thr = 0, steer = 0;
uint32_t leaseUntil = 0;
bool estopLatched = false;
bool poseSet = false;          // tant que le Pi n'a pas donné la position de départ, il ignore nos positions
uint32_t lastCmdMs = 0;
const char *stateName = "nopose";

// Odométrie
float posX = 0, posY = 0, heading = 0, speedMps = 0;
volatile int32_t ticksL = 0, ticksR = 0;
float cmdL = 0, cmdR = 0;   // consignes -1..1 appliquées (pour le sens des codeurs et l'estimation)
int frontMm = -1;

// ---------------------------------------------------------------- HMAC
static void hmac16(const char *msg, char out[17]) {
  uint8_t mac[32];
  const mbedtls_md_info_t *info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_hmac(info, (const uint8_t *)FLEET_KEY, strlen(FLEET_KEY), (const uint8_t *)msg, strlen(msg), mac);
  for (int i = 0; i < 8; i++) sprintf(out + i * 2, "%02x", mac[i]);
  out[16] = 0;
}

static bool constEq(const char *a, const char *b, size_t n) {
  uint8_t d = 0;
  for (size_t i = 0; i < n; i++) d |= (uint8_t)(a[i] ^ b[i]);
  return d == 0;
}

// ---------------------------------------------------------------- moteurs
static void motorOne(int pwm, int in1, int in2, float v, bool inv) {
  if (inv) v = -v;
  float a = fabsf(v);
  uint32_t maxDuty = (1u << MOTOR_PWM_BITS) - 1;
  if (a < 0.02f) {
    digitalWrite(in1, LOW); digitalWrite(in2, LOW); ledcWrite(pwm, 0);   // roue libre
    return;
  }
  a = MOTOR_MIN_DUTY + (1.0f - MOTOR_MIN_DUTY) * fminf(a, 1.0f);
  digitalWrite(in1, v > 0 ? HIGH : LOW);
  digitalWrite(in2, v > 0 ? LOW : HIGH);
  ledcWrite(pwm, (uint32_t)(a * maxDuty));
}

static void motors(float l, float r) {
  cmdL = constrain(l, -1.0f, 1.0f);
  cmdR = constrain(r, -1.0f, 1.0f);
  motorOne(MOTOR_L_PWM, MOTOR_L_IN1, MOTOR_L_IN2, cmdL, MOTOR_L_INVERT);
  motorOne(MOTOR_R_PWM, MOTOR_R_IN1, MOTOR_R_IN2, cmdR, MOTOR_R_INVERT);
}

static void halt(const char *why) {
  motors(0, 0);
  mode = M_STOP;
  stateName = why;
}

// ---------------------------------------------------------------- capteurs
#if ENC_L >= 0
void IRAM_ATTR onEncL() { ticksL += (cmdL >= 0 ? 1 : -1); }
void IRAM_ATTR onEncR() { ticksR += (cmdR >= 0 ? 1 : -1); }
#endif

static int readFrontMm() {
  digitalWrite(US_TRIG, LOW); delayMicroseconds(3);
  digitalWrite(US_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(US_TRIG, LOW);
  unsigned long us = pulseIn(US_ECHO, HIGH, 25000UL);   // 25 ms ≈ 4 m max ; ne bloque jamais plus
  if (!us) return -1;                                     // rien en vue (ou capteur absent)
  return (int)(us * 0.1715f);                             // aller-retour à 343 m/s
}

static int batteryMv() {
#if BATTERY_ADC >= 0
  return (int)(analogReadMilliVolts(BATTERY_ADC) * BATTERY_DIVIDER);
#else
  return 0;
#endif
}

// Intègre la position à partir des codeurs (ou de la consigne si absents).
static void odometry(float dt) {
  float dl, dr;
#if ENC_L >= 0
  noInterrupts();
  int32_t l = ticksL, r = ticksR;
  ticksL = ticksR = 0;
  interrupts();
  const float perTick = (float)M_PI * WHEEL_DIAMETER_M / TICKS_PER_REV;
  dl = l * perTick;
  dr = r * perTick;
#else
  dl = cmdL * OPEN_LOOP_MAX_MPS * dt;
  dr = cmdR * OPEN_LOOP_MAX_MPS * dt;
#endif
  float d = (dl + dr) / 2.0f, dth = (dr - dl) / WHEEL_BASE_M;
  posX += d * cosf(heading + dth / 2);
  posY += d * sinf(heading + dth / 2);
  heading = atan2f(sinf(heading + dth), cosf(heading + dth));
  speedMps = dt > 0 ? d / dt : 0;
}

// ---------------------------------------------------------------- réseau
static void sendFrame(const char *payload) {
  char body[160], sig[17], pkt[200];
  snprintf(body, sizeof(body), "NXV1|%s|%s|%lu|%s", VEHICLE_ID, nonce, (unsigned long)++txSeq, payload);
  hmac16(body, sig);
  snprintf(pkt, sizeof(pkt), "%s|%s", body, sig);
  IPAddress dst = piKnown ? piAddr : IPAddress(255, 255, 255, 255);
  udp.beginPacket(dst, TELEMETRY_PORT);
  udp.write((const uint8_t *)pkt, strlen(pkt));
  udp.endPacket();
}

static void sendHello() {
  char p[80];
  snprintf(p, sizeof(p), "HELLO|%.3f|%.3f|%.3f|%d", posX, posY, heading, batteryMv());
  sendFrame(p);
}

static void sendPose() {
  char p[120];
  snprintf(p, sizeof(p), "POSE|%.3f|%.3f|%.3f|%.3f|%d|%d|%s", posX, posY, heading, speedMps, frontMm, batteryMv(), stateName);
  sendFrame(p);
}

// Trame : NXV1|vid|nonce|seq|CMD|args…|mac
static void handlePacket(char *buf, IPAddress from) {
  char *bar = strrchr(buf, '|');
  if (!bar || strlen(bar + 1) != 16) return;
  *bar = 0;
  char sig[17];
  hmac16(buf, sig);
  if (!constEq(sig, bar + 1, 16)) return;              // signature invalide
  char *f[10]; int n = 0;
  for (char *t = strtok(buf, "|"); t && n < 10; t = strtok(NULL, "|")) f[n++] = t;
  if (n < 5 || strcmp(f[0], "NXV1") || strcmp(f[1], VEHICLE_ID) || strcmp(f[2], nonce)) return;
  uint32_t seq = strtoul(f[3], NULL, 10);
  if (seq <= rxSeq) return;                              // rejouée ou en retard
  rxSeq = seq;
  if (!piKnown || strcmp(PI_ADDRESS, "0.0.0.0") == 0) { piAddr = from; piKnown = true; }
  uint32_t now = millis();
  lastCmdMs = now;
  if (!strcmp(f[4], "SETPOSE") && n >= 8) {
    halt("pret");
    posX = atof(f[5]); posY = atof(f[6]); heading = atof(f[7]);
    poseSet = true;
    return;
  }
  if (estopLatched) { halt("arret_local"); return; }
  if (!poseSet) { halt("nopose"); return; }
  if (!strcmp(f[4], "STOP")) {
    halt("arret");
  } else if (!strcmp(f[4], "GOTO") && n >= 9) {
    tgtX = atof(f[5]); tgtY = atof(f[6]);
    vmax = constrain((float)atof(f[7]), 0.0f, MAX_SPEED_MPS);
    leaseUntil = now + min<uint32_t>(strtoul(f[8], NULL, 10), MAX_LEASE_MS);
    mode = M_GOTO; stateName = "route";
  } else if (!strcmp(f[4], "DRIVE") && n >= 8) {
    thr = constrain((float)atof(f[5]), -1.0f, 1.0f);
    steer = constrain((float)atof(f[6]), -1.0f, 1.0f);
    leaseUntil = now + min<uint32_t>(strtoul(f[7], NULL, 10), MAX_LEASE_MS);
    mode = M_DRIVE; stateName = "manuel";
  }
}

// ---------------------------------------------------------------- contrôle
static void control() {
  uint32_t now = millis();
  if (estopLatched) { motors(0, 0); return; }
  if (mode != M_STOP && (int32_t)(now - leaseUntil) > 0) { halt("bail_expire"); return; }
  if (mode == M_GOTO) {
    float dx = tgtX - posX, dy = tgtY - posY, dist = sqrtf(dx * dx + dy * dy);
    if (dist < 0.02f) { motors(0, 0); stateName = "arrive"; return; }
    float err = atan2f(dy, dx) - heading;
    err = atan2f(sinf(err), cosf(err));
    float maxCmd = vmax / OPEN_LOOP_MAX_MPS;
    if (fabsf(err) > 0.6f) {                      // trop désaligné : rotation sur place
      float t = constrain(err * 0.6f, -0.6f, 0.6f);
      motors(-t, t);
      return;
    }
    float fwd = constrain(dist * 2.5f, 0.0f, 1.0f) * maxCmd;
    if (frontMm >= 0 && frontMm < OBSTACLE_STOP_MM) { halt("bloque"); return; }
    float turn = constrain(err * 1.2f, -0.5f, 0.5f) * maxCmd;
    motors(fwd - turn, fwd + turn);
  } else if (mode == M_DRIVE) {
    float t = thr;
    if (t > 0 && frontMm >= 0 && frontMm < OBSTACLE_STOP_MM) { t = 0; stateName = "bloque"; }
    motors(t - steer * 0.6f, t + steer * 0.6f);
  } else {
    motors(0, 0);
  }
}

// ---------------------------------------------------------------- Arduino
void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_L_IN1, OUTPUT); pinMode(MOTOR_L_IN2, OUTPUT);
  pinMode(MOTOR_R_IN1, OUTPUT); pinMode(MOTOR_R_IN2, OUTPUT);
  ledcAttach(MOTOR_L_PWM, MOTOR_PWM_FREQ, MOTOR_PWM_BITS);
  ledcAttach(MOTOR_R_PWM, MOTOR_PWM_FREQ, MOTOR_PWM_BITS);
  motors(0, 0);
  pinMode(US_TRIG, OUTPUT); pinMode(US_ECHO, INPUT);
#if ESTOP_PIN >= 0
  pinMode(ESTOP_PIN, INPUT_PULLUP);
#endif
#if STATUS_LED >= 0
  pinMode(STATUS_LED, OUTPUT);
#endif
#if ENC_L >= 0
  pinMode(ENC_L, INPUT); pinMode(ENC_R, INPUT);
  attachInterrupt(digitalPinToInterrupt(ENC_L), onEncL, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC_R), onEncR, RISING);
#endif
  snprintf(nonce, sizeof(nonce), "%08lx", (unsigned long)esp_random());
  if (strcmp(PI_ADDRESS, "0.0.0.0") != 0) piKnown = piAddr.fromString(PI_ADDRESS);
  if (strlen(FLEET_KEY) < 16 || !strcmp(FLEET_KEY, "change-moi-cle-de-flotte"))
    Serial.println(F("# ATTENTION : FLEET_KEY d'exemple ou trop courte — change-la dans config.h"));
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);                    // latence radio minimale pour les commandes
  WiFi.begin(LAB_AP_SSID, LAB_AP_PASSWORD);
  udp.begin(CMD_PORT);
  Serial.printf("# NEXUS véhicule %s prêt (session %s) — position de départ (0;0), cap 0 = axe X\n", VEHICLE_ID, nonce);
}

void loop() {
  static uint32_t lastCtl = 0, lastPose = 0, lastHello = 0, lastUs = 0;
  uint32_t now = millis();

#if ESTOP_PIN >= 0
  if (digitalRead(ESTOP_PIN) == LOW && !estopLatched) { estopLatched = true; halt("arret_local"); Serial.println(F("# ARRÊT D'URGENCE LOCAL")); }
#endif
  if (WiFi.status() != WL_CONNECTED && mode != M_STOP) halt("wifi_perdu");

  int sz = udp.parsePacket();
  if (sz > 0 && sz < 200) {
    char buf[200];
    int len = udp.read(buf, sizeof(buf) - 1);
    if (len > 0) { buf[len] = 0; handlePacket(buf, udp.remoteIP()); }
  } else if (sz > 0) {
    udp.flush();
  }

  if (now - lastUs >= 60) { lastUs = now; frontMm = readFrontMm(); }
  if (now - lastCtl >= 20) {
    float dt = (now - lastCtl) / 1000.0f;
    lastCtl = now;
    odometry(dt);
    control();
  }
  // Pi redémarré ou hors de portée : on se réannonce pour qu'il nous retrouve.
  if (piKnown && strcmp(PI_ADDRESS, "0.0.0.0") == 0 && now - lastCmdMs > 5000) piKnown = false;
  if (WiFi.status() == WL_CONNECTED) {
    if (!piKnown && now - lastHello >= 1000) { lastHello = now; sendHello(); }
    if (piKnown && now - lastPose >= 100) { lastPose = now; sendPose(); }
  }
#if STATUS_LED >= 0
  digitalWrite(STATUS_LED, estopLatched ? ((now / 100) & 1) : (mode == M_STOP ? ((now / 1000) & 1) : HIGH));
#endif
}
