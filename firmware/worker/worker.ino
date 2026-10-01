// ESP32 LAB — Worker v6.0.0 (Arduino-ESP32 3.3.x)
// Rejoint le point d'accès du MASTER, s'annonce (UDP 4211), envoie un heartbeat par seconde
// et exécute les jobs de diagnostic demandés par le MASTER ou par sa propre page web.

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Update.h>
#include <Preferences.h>
#include <LittleFS.h>
#include <ESPmDNS.h>
#include <Wire.h>
#include <FS.h>
#include <mbedtls/sha256.h>
#include <esp_ota_ops.h>
#include <esp_system.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include "config.h"

Preferences prefs;
WebServer server(80);
WiFiUDP udp;
WiFiUDP logUdp;
uint8_t workerId = DEFAULT_WORKER_ID;
IPAddress masterIP(192, 168, 4, 1);

String state = "BOOT";
String currentJob = "";
String lastResult = "";
String bootId = "";
uint32_t progress = 0;
uint32_t lastHeartbeat = 0;
uint32_t lastDiscovery = 0;
uint32_t lastJob = 0;
uint32_t lastReconnect = 0;
uint32_t bootCount = 0;
uint32_t jobsDone = 0;
int32_t lastRssi = 0;
bool fsMounted = false;

volatile uint32_t benchmarkSink = 0;

enum ServiceJob : uint8_t {
  SERVICE_NONE = 0,
  SERVICE_SYSTEM_TEST,
  SERVICE_BENCHMARK,
  SERVICE_FS_TEST,
  SERVICE_I2C_SCAN,
  SERVICE_WIFI_SCAN,
  SERVICE_MEM_TEST,
  SERVICE_IDENTIFY
};

ServiceJob serviceJobKind = SERVICE_NONE;
bool serviceTurbo = false;
bool cancelRequested = false;
uint8_t servicePhase = 0;
uint32_t servicePhaseAt = 0;
bool cpuOk = false, flashOk = false, wifiOk = false, fsOk = false;
uint32_t benchmarkElapsedUs = 0;
uint32_t benchmarkOpsPerSec = 0;
uint32_t benchmarkDone = 0;
uint8_t i2cNextAddr = 0x08;
String i2cFound = "";
uint8_t i2cCount = 0;
uint32_t memBlocks = 0;
String resumeType = "";
uint8_t resumePhase = 0;
uint32_t resumeProgress = 0;
uint32_t resumeBenchmarkDone = 0;
bool resumePending = false;
uint32_t lastCheckpointMs = 0;
uint32_t lastCheckpointProgress = 0;

static void logLine(const String &s);

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

static String urlDecode(const String &in) {
  String out;
  out.reserve(in.length());
  auto hexValue = [](char x) -> int {
    if (x >= '0' && x <= '9') return x - '0';
    if (x >= 'A' && x <= 'F') return x - 'A' + 10;
    if (x >= 'a' && x <= 'f') return x - 'a' + 10;
    return -1;
  };
  for (size_t i = 0; i < in.length(); ++i) {
    char c = in[i];
    if (c == '%' && i + 2 < in.length()) {
      int a = hexValue(in[i + 1]);
      int b = hexValue(in[i + 2]);
      if (a >= 0 && b >= 0) {
        out += static_cast<char>((a << 4) | b);
        i += 2;
        continue;
      }
    }
    if (c == '+') c = ' ';
    out += c;
  }
  return out;
}

static String jsonEscape(const String &in) {
  String out;
  out.reserve(in.length() + 8);
  for (size_t i = 0; i < in.length(); ++i) {
    char c = in[i];
    if (c == '"' || c == '\\') {
      out += '\\';
      out += c;
    } else if (static_cast<uint8_t>(c) < 0x20) {
      out += ' ';
    } else {
      out += c;
    }
  }
  return out;
}

static void saveApCredentials(const String &ssid, const String &pass) {
  prefs.begin("ap", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
}

static void loadApCredentials(String &ssid, String &pass) {
  prefs.begin("ap", true);
  ssid = prefs.getString("ssid", LAB_AP_SSID);
  pass = prefs.getString("pass", LAB_AP_PASSWORD);
  prefs.end();
  if (ssid.isEmpty()) ssid = LAB_AP_SSID;
  if (pass.length() < 8) pass = LAB_AP_PASSWORD;
}

static const char *resetReasonName(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_POWERON: return "PowerOn";
    case ESP_RST_EXT: return "External";
    case ESP_RST_SW: return "Software";
    case ESP_RST_PANIC: return "Crash";
    case ESP_RST_INT_WDT: return "WDT_Int";
    case ESP_RST_TASK_WDT: return "WDT_Task";
    case ESP_RST_WDT: return "WDT";
    case ESP_RST_DEEPSLEEP: return "DeepSleep";
    case ESP_RST_BROWNOUT: return "Brownout";
    case ESP_RST_SDIO: return "SDIO";
    default: return "Other";
  }
}

static String macString() {
  uint8_t m[6];
  WiFi.macAddress(m);
  char b[18];
  snprintf(b, sizeof(b), "%02X:%02X:%02X:%02X:%02X:%02X", m[0], m[1], m[2], m[3], m[4], m[5]);
  return String(b);
}

static void remember(const String &kind, const String &note) {
  if (!fsMounted) return;
  File f = LittleFS.open("/worker_memory.log", "a");
  if (!f) return;
  if (f.size() > 32768) {  // rotation simple : le journal ne remplit jamais la flash
    f.close();
    LittleFS.remove("/worker_memory.old");
    LittleFS.rename("/worker_memory.log", "/worker_memory.old");
    f = LittleFS.open("/worker_memory.log", "a");
    if (!f) return;
  }
  f.printf("%lu|%s|%s\n", static_cast<unsigned long>(millis()), kind.c_str(), note.c_str());
  f.close();
}

// ---------------------------------------------------------------------------
// Points de reprise (reprise d'un job après coupure de courant)
// ---------------------------------------------------------------------------

static bool resumableJob(const String &type) {
  return type == "SYSTEM_TEST" || type == "BENCHMARK" || type == "FS_TEST";
}

static void clearCheckpoint() {
  if (fsMounted) LittleFS.remove("/resume.cfg");
  resumeType = "";
  resumePending = false;
}

static void saveCheckpoint() {
  if (!fsMounted || currentJob.isEmpty() || !resumableJob(currentJob)) return;
  if (millis() - lastCheckpointMs < CHECKPOINT_INTERVAL_MS && progress < lastCheckpointProgress + CHECKPOINT_PROGRESS_STEP) return;
  File f = LittleFS.open("/resume.cfg", "w");
  if (!f) return;
  f.printf("type=%s\nphase=%u\nprogress=%lu\nbench=%lu\n", currentJob.c_str(), servicePhase,
           static_cast<unsigned long>(progress), static_cast<unsigned long>(benchmarkDone));
  f.close();
  lastCheckpointMs = millis();
  lastCheckpointProgress = progress;
}

static bool loadCheckpoint() {
  if (!fsMounted) return false;
  File f = LittleFS.open("/resume.cfg", "r");
  if (!f) return false;
  String type = "";
  uint8_t phase = 0;
  uint32_t pct = 0, bench = 0;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    int sep = line.indexOf('=');
    if (sep < 1) continue;
    String k = line.substring(0, sep);
    String v = line.substring(sep + 1);
    if (k == "type") type = v;
    else if (k == "phase") phase = static_cast<uint8_t>(v.toInt());
    else if (k == "progress") pct = static_cast<uint32_t>(v.toInt());
    else if (k == "bench") bench = static_cast<uint32_t>(v.toInt());
  }
  f.close();
  if (!resumableJob(type)) {
    LittleFS.remove("/resume.cfg");
    return false;
  }
  resumeType = type;
  resumePhase = phase;
  resumeProgress = pct > 100 ? 100 : pct;
  resumeBenchmarkDone = bench > BENCHMARK_OPERATIONS ? BENCHMARK_OPERATIONS : bench;
  resumePending = true;
  return true;
}

static void startResumeIfNeeded() {
  if (!resumePending || WiFi.status() != WL_CONNECTED || state == "FLASHING" || serviceJobKind != SERVICE_NONE) return;
  String type = resumeType;
  resumePending = false;
  serviceTurbo = false;
  cancelRequested = false;
  servicePhase = resumePhase;
  servicePhaseAt = millis();
  progress = resumeProgress;
  lastResult = "RESUMING";
  state = "TESTING";
  currentJob = type;
  lastJob = millis();
  serviceJobKind = (type == "BENCHMARK") ? SERVICE_BENCHMARK : (type == "FS_TEST" ? SERVICE_FS_TEST : SERVICE_SYSTEM_TEST);
  benchmarkDone = resumeBenchmarkDone;
  if (type == "BENCHMARK") benchmarkElapsedUs = micros();
  logLine(String("RESUME ") + type + " progress=" + resumeProgress);
}

// ---------------------------------------------------------------------------
// Réseau
// ---------------------------------------------------------------------------

static void logLine(const String &s) {
  Serial.println(s);
  if (WiFi.status() == WL_CONNECTED && masterIP != IPAddress(0, 0, 0, 0)) {
    String packet = "LOG|W" + String(workerId) + "|" + String(millis()) + "|" + s;
    logUdp.beginPacket(masterIP, LOG_UDP_PORT);
    logUdp.write(reinterpret_cast<const uint8_t *>(packet.c_str()), packet.length());
    logUdp.endPacket();
  }
}

static void connectLabWifi() {
  String ssid, pass;
  loadApCredentials(ssid, pass);
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // réception UDP plus fiable (broadcasts du MASTER)
  WiFi.setHostname((String("esp32-lab-w") + String(workerId)).c_str());
  WiFi.begin(ssid.c_str(), pass.c_str());

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000UL) delay(100);

  if (WiFi.status() != WL_CONNECTED && (ssid != LAB_AP_SSID || pass != LAB_AP_PASSWORD)) {
    WiFi.disconnect(true);
    delay(100);
    WiFi.begin(LAB_AP_SSID, LAB_AP_PASSWORD);
    start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 6000UL) delay(100);
  }
  lastRssi = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -127;
}

static void startNetworkSockets() {
  if (WiFi.status() != WL_CONNECTED) return;
  udp.stop();
  logUdp.stop();
  udp.begin(DISCOVERY_PORT);
  logUdp.begin(LOG_UDP_PORT);
  MDNS.end();
  if (MDNS.begin((String("esp32-lab-w") + String(workerId)).c_str())) MDNS.addService("http", "tcp", 80);
}

static String infoJson() {
  lastRssi = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -127;
  String json;
  json.reserve(1400);
  json = "{";
  json += "\"id\":" + String(workerId);
  json += ",\"name\":\"W" + String(workerId) + "\"";
  json += ",\"hostname\":\"esp32-lab-w" + String(workerId) + ".local\"";
  json += ",\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += ",\"mac\":\"" + macString() + "\"";
  json += ",\"version\":\"" + String(LAB_VERSION) + "\"";
  json += ",\"protocol\":" + String(WORKER_PROTOCOL_VERSION);
  json += ",\"state\":\"" + state + "\"";
  json += ",\"job\":\"" + currentJob + "\"";
  json += ",\"progress\":" + String(progress);
  json += ",\"jobs_done\":" + String(jobsDone);
  json += ",\"uptime_ms\":" + String(millis());
  json += ",\"free_heap\":" + String(ESP.getFreeHeap());
  json += ",\"heap_total\":" + String(ESP.getHeapSize());
  json += ",\"heap_min\":" + String(ESP.getMinFreeHeap());
  json += ",\"max_alloc\":" + String(ESP.getMaxAllocHeap());
  json += ",\"psram\":" + String(ESP.getPsramSize());
  json += ",\"psram_free\":" + String(ESP.getFreePsram());
  json += ",\"cpu_mhz\":" + String(ESP.getCpuFreqMHz());
  json += ",\"cores\":" + String(ESP.getChipCores());
  json += ",\"chip\":\"" + String(ESP.getChipModel()) + "\"";
  json += ",\"chip_revision\":" + String(ESP.getChipRevision());
  json += ",\"flash_size\":" + String(ESP.getFlashChipSize());
  json += ",\"flash_speed\":" + String(ESP.getFlashChipSpeed());
  json += ",\"sketch_size\":" + String(ESP.getSketchSize());
  json += ",\"sketch_free\":" + String(ESP.getFreeSketchSpace());
  json += ",\"rssi\":" + String(lastRssi);
  json += ",\"boot_count\":" + String(bootCount);
  json += ",\"reset_reason\":\"" + String(resetReasonName(esp_reset_reason())) + "\"";
  json += ",\"boot_id\":\"" + bootId + "\"";
  json += ",\"last_result\":\"" + jsonEscape(lastResult) + "\"";
  json += ",\"resume_pending\":" + String(resumePending ? "true" : "false");
  json += ",\"checkpoint_progress\":" + String(resumeProgress);
  json += ",\"checkpoint_type\":\"" + resumeType + "\"";
  json += ",\"checkpoint_phase\":" + String(resumePhase);
  json += ",\"stack_free\":" + String(uxTaskGetStackHighWaterMark(NULL));
  json += ",\"sdk\":\"" + String(ESP.getSdkVersion()) + "\"";
  json += ",\"core_version\":\"" + String(ESP.getCoreVersion()) + "\"";
  json += ",\"fs_total\":" + String(fsMounted ? LittleFS.totalBytes() : 0);
  json += ",\"fs_used\":" + String(fsMounted ? LittleFS.usedBytes() : 0);
  json += "}";
  return json;
}

static void sendDiscovery() {
  String packet = "HELLO|" + macString() + "|" + String(LAB_VERSION) + "|" + WiFi.localIP().toString() + "|" +
                  String(WORKER_PROTOCOL_VERSION);
  udp.beginPacket(IPAddress(255, 255, 255, 255), DISCOVERY_PORT);
  udp.write(reinterpret_cast<const uint8_t *>(packet.c_str()), packet.length());
  udp.endPacket();
}

// Format (protocole 3, compatible 5.2) :
// HB|ID|MAC|STATE|PROGRESS|UPTIME|FREE_HEAP|IP|JOB|RSSI|CPU_MHZ|HEAP_MIN|FLASH_SIZE|CORES|PSRAM_SIZE|
//    RESUME_PENDING|CHECKPOINT_PROGRESS|CHECKPOINT_TYPE|CHECKPOINT_PHASE|JOBS_DONE
static void sendHeartbeat() {
  if (workerId == 0) return;  // pas encore d'identifiant attribué par le MASTER
  lastRssi = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -127;
  String packet = "HB|" + String(workerId) + "|" + macString() + "|" + state + "|" + String(progress) + "|" +
                  String(millis()) + "|" + String(ESP.getFreeHeap()) + "|" + WiFi.localIP().toString() + "|" + currentJob +
                  "|" + String(lastRssi) + "|" + String(ESP.getCpuFreqMHz()) + "|" + String(ESP.getMinFreeHeap()) +
                  "|" + String(ESP.getFlashChipSize()) + "|" + String(ESP.getChipCores()) + "|" + String(ESP.getPsramSize()) +
                  "|" + String(resumePending ? 1 : 0) + "|" + String(resumeProgress) + "|" + resumeType + "|" +
                  String(resumePhase) + "|" + String(jobsDone);
  logUdp.beginPacket(masterIP, DISCOVERY_PORT);
  logUdp.write(reinterpret_cast<const uint8_t *>(packet.c_str()), packet.length());
  logUdp.endPacket();
}

// ---------------------------------------------------------------------------
// Jobs de diagnostic
// ---------------------------------------------------------------------------

static void setLed(bool on) {
#if WORKER_LED_PIN >= 0
  digitalWrite(WORKER_LED_PIN, on ? HIGH : LOW);
#else
  (void)on;
#endif
}

static void cancelServiceJob() {
  cancelRequested = false;
  serviceJobKind = SERVICE_NONE;
  servicePhase = 0;
  progress = 0;
  clearCheckpoint();
  setLed(false);
  WiFi.scanDelete();
  lastResult = "CANCELLED";
  currentJob = "";
  state = "READY";
  jobsDone++;
  remember("JOB", "cancelled");
  logLine("JOB CANCELLED");
}

static void finishServiceJob(bool ok, const String &result) {
  serviceJobKind = SERVICE_NONE;
  servicePhase = 0;
  progress = ok ? 100 : 0;
  clearCheckpoint();
  lastResult = result;
  currentJob = "";
  state = ok ? "READY" : "ERROR";
  jobsDone++;
  remember(ok ? "TEST" : "ERROR", result);
  logLine(result);
}

static bool runFsSelfTest(String &detail) {
  if (!fsMounted) {
    detail = "FS=FAIL_MOUNT";
    return false;
  }
  const char *path = "/selftest.bin";
  File f = LittleFS.open(path, "w");
  if (!f) {
    detail = "FS=FAIL_WRITE_OPEN";
    return false;
  }
  uint8_t block[128];
  uint32_t t0 = micros();
  size_t written = 0;
  while (written < FS_TEST_BYTES) {
    for (size_t i = 0; i < sizeof(block); ++i) block[i] = static_cast<uint8_t>((written + i) ^ 0xA5U);
    size_t n = min(sizeof(block), static_cast<size_t>(FS_TEST_BYTES - written));
    if (f.write(block, n) != n) {
      f.close();
      LittleFS.remove(path);
      detail = "FS=FAIL_WRITE";
      return false;
    }
    written += n;
  }
  f.close();
  uint32_t writeUs = micros() - t0;

  f = LittleFS.open(path, "r");
  if (!f) {
    LittleFS.remove(path);
    detail = "FS=FAIL_READ_OPEN";
    return false;
  }
  t0 = micros();
  size_t readTotal = 0;
  bool valid = true;
  while (readTotal < FS_TEST_BYTES && valid) {
    size_t n = min(sizeof(block), static_cast<size_t>(FS_TEST_BYTES - readTotal));
    size_t got = f.read(block, n);
    if (got != n) {
      valid = false;
      break;
    }
    for (size_t i = 0; i < got; ++i) {
      if (block[i] != static_cast<uint8_t>((readTotal + i) ^ 0xA5U)) {
        valid = false;
        break;
      }
    }
    readTotal += got;
  }
  f.close();
  uint32_t readUs = micros() - t0;
  LittleFS.remove(path);
  detail = valid ? "FS=PASS" : "FS=FAIL_VERIFY";
  if (valid) {
    detail += " W=" + String(writeUs ? (FS_TEST_BYTES * 1000UL) / writeUs : 0) + "KB/s";
    detail += " R=" + String(readUs ? (FS_TEST_BYTES * 1000UL) / readUs : 0) + "KB/s";
  }
  return valid;
}

static void startServiceJob(String type, bool turbo) {
  if (type == "CHECKUP") type = "SYSTEM_TEST";
  serviceTurbo = turbo;
  cancelRequested = false;
  clearCheckpoint();
  benchmarkDone = 0;
  lastCheckpointMs = 0;
  lastCheckpointProgress = 0;
  servicePhase = 0;
  servicePhaseAt = millis();
  progress = 0;
  lastResult = "RUNNING";
  state = "TESTING";
  currentJob = type;
  lastJob = millis();

  if (type == "BENCHMARK") serviceJobKind = SERVICE_BENCHMARK;
  else if (type == "FS_TEST") serviceJobKind = SERVICE_FS_TEST;
  else if (type == "I2C_SCAN") serviceJobKind = SERVICE_I2C_SCAN;
  else if (type == "WIFI_SCAN") serviceJobKind = SERVICE_WIFI_SCAN;
  else if (type == "MEM_TEST") serviceJobKind = SERVICE_MEM_TEST;
  else if (type == "IDENTIFY") serviceJobKind = SERVICE_IDENTIFY;
  else serviceJobKind = SERVICE_SYSTEM_TEST;
  logLine("JOB START " + type);
}

static void serviceSystemTest() {
  uint32_t delayMs = serviceTurbo ? 25UL : 120UL;
  if (millis() - servicePhaseAt < delayMs) return;
  servicePhaseAt = millis();
  switch (servicePhase) {
    case 0:
      cpuOk = ESP.getCpuFreqMHz() > 0 && ESP.getChipCores() >= 1;
      progress = 20;
      servicePhase = 1;
      break;
    case 1:
      flashOk = ESP.getFlashChipSize() >= (1024UL * 1024UL);
      progress = 40;
      servicePhase = 2;
      break;
    case 2:
      wifiOk = WiFi.status() == WL_CONNECTED;
      progress = 60;
      servicePhase = 3;
      break;
    case 3:
      fsOk = fsMounted;
      progress = 80;
      servicePhase = 4;
      break;
    default: {
      bool ok = cpuOk && flashOk && wifiOk && fsOk;
      String result = String("CPU=") + (cpuOk ? "PASS" : "FAIL") + " FLASH=" + (flashOk ? "PASS" : "FAIL") +
                      " WIFI=" + (wifiOk ? "PASS" : "FAIL") + " FS=" + (fsOk ? "PASS" : "FAIL") +
                      " CPU_MHZ=" + String(ESP.getCpuFreqMHz()) + " HEAP=" + String(ESP.getFreeHeap()) +
                      " RSSI=" + String(lastRssi);
      finishServiceJob(ok, result);
      return;
    }
  }
  saveCheckpoint();
}

static void serviceBenchmark() {
  const uint32_t chunk = 6000UL;
  if (benchmarkDone == 0 && servicePhase == 0) {
    benchmarkElapsedUs = micros();
    benchmarkSink = 0x12345678UL;
    servicePhase = 1;
  }
  if (servicePhase != 1) return;
  uint32_t x = benchmarkSink;
  uint32_t end = min(benchmarkDone + chunk, static_cast<uint32_t>(BENCHMARK_OPERATIONS));
  for (uint32_t i = benchmarkDone; i < end; ++i) {
    x = x * 1664525UL + 1013904223UL;
    x ^= x >> 13;
  }
  benchmarkSink = x;
  benchmarkDone = end;
  progress = static_cast<uint32_t>((static_cast<uint64_t>(benchmarkDone) * 100ULL) / BENCHMARK_OPERATIONS);
  saveCheckpoint();
  if (benchmarkDone >= BENCHMARK_OPERATIONS) {
    benchmarkElapsedUs = micros() - benchmarkElapsedUs;
    benchmarkOpsPerSec = benchmarkElapsedUs
                             ? static_cast<uint32_t>((static_cast<uint64_t>(BENCHMARK_OPERATIONS) * 1000000ULL) / benchmarkElapsedUs)
                             : 0;
    String result = "BENCHMARK OPS=" + String(BENCHMARK_OPERATIONS) + " US=" + String(benchmarkElapsedUs) +
                    " OPS_S=" + String(benchmarkOpsPerSec) + " CPU_MHZ=" + String(ESP.getCpuFreqMHz()) +
                    " HEAP=" + String(ESP.getFreeHeap());
    finishServiceJob(benchmarkElapsedUs > 0, result);
  }
}

static void serviceFsTest() {
  if (servicePhase == 0) {
    servicePhase = 1;
    progress = 50;
    return;  // laisse passer un heartbeat « TESTING »
  }
  String detail;
  bool ok = runFsSelfTest(detail);
  finishServiceJob(ok, detail + " FREE_HEAP=" + String(ESP.getFreeHeap()));
}

static void serviceI2cScan() {
  if (servicePhase == 0) {
    Wire.begin(WORKER_I2C_SDA, WORKER_I2C_SCL);
    Wire.setClock(100000);
    i2cNextAddr = 0x08;
    i2cFound = "";
    i2cCount = 0;
    servicePhase = 1;
  }
  // 8 adresses par passage de loop() pour ne pas bloquer le serveur web
  for (uint8_t k = 0; k < 8 && i2cNextAddr <= 0x77; ++k, ++i2cNextAddr) {
    Wire.beginTransmission(i2cNextAddr);
    if (Wire.endTransmission() == 0) {
      char b[6];
      snprintf(b, sizeof(b), "0x%02X", i2cNextAddr);
      if (i2cCount) i2cFound += ' ';
      i2cFound += b;
      i2cCount++;
    }
  }
  progress = static_cast<uint32_t>(((i2cNextAddr - 0x08) * 100UL) / (0x78 - 0x08));
  if (i2cNextAddr > 0x77) {
    Wire.end();
    String result = "I2C SDA=" + String(WORKER_I2C_SDA) + " SCL=" + String(WORKER_I2C_SCL) + " FOUND=" + String(i2cCount);
    if (i2cCount) result += " : " + i2cFound;
    finishServiceJob(true, result);
  }
}

static void serviceWifiScan() {
  if (servicePhase == 0) {
    WiFi.scanDelete();
    WiFi.scanNetworks(true, true, false, 200);
    servicePhase = 1;
    progress = 10;
    return;
  }
  int16_t n = WiFi.scanComplete();
  if (n == WIFI_SCAN_RUNNING) {
    if (progress < 90) progress += 1;
    return;
  }
  if (n < 0) {
    finishServiceJob(false, "WIFI_SCAN=FAIL");
    return;
  }
  int best = -1;
  for (int16_t i = 0; i < n; ++i)
    if (best < 0 || WiFi.RSSI(i) > WiFi.RSSI(best)) best = i;
  String result = "WIFI_SCAN NETWORKS=" + String(n);
  if (best >= 0) result += " BEST=" + WiFi.SSID(best) + "(" + String(WiFi.RSSI(best)) + "dBm CH" + String(WiFi.channel(best)) + ")";
  WiFi.scanDelete();
  finishServiceJob(true, result);
}

static void serviceMemTest() {
  // Alloue des blocs de 4 Ko jusqu'à ~60 % de la RAM libre, écrit un motif, relit, libère.
  static void *blocks[64];
  if (servicePhase == 0) {
    memBlocks = 0;
    uint32_t target = (ESP.getFreeHeap() * 6UL) / 10UL / 4096UL;
    if (target > 64) target = 64;
    for (uint32_t i = 0; i < target; ++i) {
      blocks[i] = malloc(4096);
      if (!blocks[i]) break;
      memset(blocks[i], static_cast<int>(0x5A ^ i), 4096);
      memBlocks++;
    }
    servicePhase = 1;
    progress = 50;
    return;
  }
  bool ok = memBlocks > 0;
  for (uint32_t i = 0; i < memBlocks; ++i) {
    const uint8_t *p = static_cast<const uint8_t *>(blocks[i]);
    for (uint32_t k = 0; k < 4096; k += 97) {
      if (p[k] != static_cast<uint8_t>(0x5A ^ i)) ok = false;
    }
    free(blocks[i]);
    blocks[i] = nullptr;
  }
  finishServiceJob(ok, String("MEM_TEST=") + (ok ? "PASS" : "FAIL") + " BLOCKS=" + String(memBlocks) + "x4KB MAX_ALLOC=" +
                           String(ESP.getMaxAllocHeap()) + " HEAP_MIN=" + String(ESP.getMinFreeHeap()));
}

static void serviceIdentify() {
  // 20 clignotements en 5 s pour repérer physiquement la carte
  if (millis() - servicePhaseAt < 125UL) return;
  servicePhaseAt = millis();
  servicePhase++;
  setLed(servicePhase % 2 == 1);
  progress = static_cast<uint32_t>((servicePhase * 100UL) / 40UL);
  if (servicePhase >= 40) {
    setLed(false);
    finishServiceJob(true, "IDENTIFY W" + String(workerId) + " LED=GPIO" + String(WORKER_LED_PIN));
  }
}

static void serviceJobs() {
  if (serviceJobKind == SERVICE_NONE) return;
  if (cancelRequested) {
    cancelServiceJob();
    return;
  }
  if (millis() - lastJob > JOB_TIMEOUT_MS) {
    serviceJobKind = SERVICE_NONE;
    clearCheckpoint();
    finishServiceJob(false, "JOB_TIMEOUT");
    return;
  }
  switch (serviceJobKind) {
    case SERVICE_SYSTEM_TEST: serviceSystemTest(); break;
    case SERVICE_BENCHMARK: serviceBenchmark(); break;
    case SERVICE_FS_TEST: serviceFsTest(); break;
    case SERVICE_I2C_SCAN: serviceI2cScan(); break;
    case SERVICE_WIFI_SCAN: serviceWifiScan(); break;
    case SERVICE_MEM_TEST: serviceMemTest(); break;
    case SERVICE_IDENTIFY: serviceIdentify(); break;
    default: break;
  }
}

// ---------------------------------------------------------------------------
// Mise à jour OTA depuis le MASTER (SHA-256 vérifié avant activation)
// ---------------------------------------------------------------------------

static bool validSha256(const String &value) {
  if (value.length() != 64) return false;
  for (size_t i = 0; i < value.length(); ++i) {
    char c = value[i];
    bool ok = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
    if (!ok) return false;
  }
  return true;
}

static void otaFail(const String &why) {
  lastResult = why;
  state = "ERROR";
  currentJob = "";
  progress = 0;
  remember("ERROR", why);
  logLine(why);
}

static void flashFromMaster(const String &url, const String &expected, bool asProject) {
  if (!validSha256(expected) || url.length() < 8 || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    otaFail("OTA_INVALID_REQUEST");
    return;
  }
  state = "FLASHING";
  currentJob = "OTA";
  progress = 0;
  lastJob = millis();
  logLine("OTA start");
  remember("OTA", "start");

  HTTPClient http;
  if (!http.begin(url)) {
    otaFail("OTA_BEGIN_FAILED");
    return;
  }
  http.setConnectTimeout(10000);
  http.setTimeout(OTA_HTTP_TIMEOUT_MS);
  int code = http.GET();
  if (code != 200) {
    http.end();
    otaFail("OTA_HTTP_" + String(code));
    return;
  }
  int total = http.getSize();
  if (total <= 0 || static_cast<uint32_t>(total) > MAX_UPLOAD_BYTES) {
    http.end();
    otaFail("OTA_BAD_SIZE");
    return;
  }
  if (!Update.begin(static_cast<size_t>(total))) {
    http.end();
    otaFail("OTA_NO_SPACE (schéma de partition avec OTA requis)");
    return;
  }

  NetworkClient *stream = http.getStreamPtr();
  stream->setTimeout(1000);
  mbedtls_sha256_context ctx;
  mbedtls_sha256_init(&ctx);
  mbedtls_sha256_starts(&ctx, 0);
  static uint8_t buffer[4096];
  size_t written = 0;
  uint32_t lastData = millis();
  uint32_t lastBeat = 0;

  while (written < static_cast<size_t>(total)) {
    if (millis() - lastData > OTA_IDLE_TIMEOUT_MS) {
      Update.abort();
      mbedtls_sha256_free(&ctx);
      http.end();
      otaFail("OTA_TIMEOUT");
      return;
    }
    if (millis() - lastBeat > HEARTBEAT_INTERVAL_MS) {  // le MASTER voit la progression
      sendHeartbeat();
      lastBeat = millis();
    }
    size_t available = stream->available();
    if (available == 0) {
      delay(2);
      continue;
    }
    size_t readBytes = stream->readBytes(buffer, min(available, sizeof(buffer)));
    if (readBytes == 0) continue;
    if (Update.write(buffer, readBytes) != readBytes) {
      Update.abort();
      mbedtls_sha256_free(&ctx);
      http.end();
      otaFail("OTA_WRITE_FAILED");
      return;
    }
    mbedtls_sha256_update(&ctx, buffer, readBytes);
    written += readBytes;
    const uint32_t before = progress;
    progress = static_cast<uint32_t>((static_cast<uint64_t>(written) * 100ULL) / static_cast<uint64_t>(total));
    if (progress / 10 != before / 10) logLine("OTA " + String(progress) + " % (" + String(written / 1024) + " Ko)");
    lastData = millis();
  }
  http.end();

  uint8_t digest[32];
  mbedtls_sha256_finish(&ctx, digest);
  mbedtls_sha256_free(&ctx);
  char got[65];
  for (size_t i = 0; i < sizeof(digest); ++i) snprintf(got + i * 2, 3, "%02x", digest[i]);
  if (!expected.equalsIgnoreCase(got)) {
    Update.abort();
    otaFail("OTA_SHA_MISMATCH");
    return;
  }
  if (asProject) {
    // Mode projet : le worker reste dans sa partition actuelle ; le projet va dans l'autre.
    // On mémorise où revenir et comment joindre le MASTER (lu par le code « retour worker » des projets).
    const esp_partition_t *home = esp_ota_get_running_partition();
    String ssid, pass;
    loadApCredentials(ssid, pass);
    Preferences lab;
    lab.begin("lab", false);
    lab.putString("home", home ? home->label : "");
    lab.putString("master", masterIP.toString());
    lab.putString("ssid", ssid);
    lab.putString("pass", pass);
    lab.putUChar("wid", workerId);
    lab.end();
  }
  if (!Update.end(true)) {
    otaFail("OTA_FINALIZE_FAILED");
    return;
  }
  lastResult = asProject ? "PROJECT_LOADED" : "OTA_VERIFIED";
  logLine("OTA verified; reboot");
  delay(300);
  ESP.restart();
}

// ---------------------------------------------------------------------------
// Banc fantôme : le worker se fait passer pour les capteurs d'un projet (DAC, GPIO, esclave I2C)
// et observe ses actionneurs. Il ne connaît aucun capteur : le MASTER envoie des valeurs brutes
// (mV, niveau, octets de registre) calculées par le générateur (catalog/src/12_bench.js).
// ---------------------------------------------------------------------------

enum EmuKind : uint8_t { EMU_NONE = 0, EMU_ANALOG, EMU_DIGITAL, EMU_I2C, EMU_LEVEL, EMU_DUTY };
struct EmuChannel {
  EmuKind kind;
  int8_t pin;
};

static const int8_t benchDacPins[] = BENCH_DAC_PINS;
static const int8_t benchDoutPins[] = BENCH_DOUT_PINS;
static const int8_t benchDinPins[] = BENCH_DIN_PINS;

#define EMU_MAX_CH 8
EmuChannel emuCh[EMU_MAX_CH];
bool emuActive = false;
uint32_t emuLastCall = 0;
uint8_t emuI2cAddr = 0;
bool emuI2cPointer = true;
bool emuI2cOnline = false;
portMUX_TYPE emuMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint8_t emuRegs[4][2];  // registres 16 bits ; le 0 porte la mesure
volatile uint8_t emuPtr = 0;

template <size_t N>
static bool benchPinAllowed(const int8_t (&pins)[N], int pin) {
  for (size_t i = 0; i < N; ++i)
    if (pins[i] >= 0 && pins[i] == pin) return true;
  return false;
}

static String benchPinList(const int8_t *pins, size_t n) {
  String s = "[";
  for (size_t i = 0; i < n; ++i) {
    if (pins[i] < 0) continue;
    if (s.length() > 1) s += ',';
    s += String(pins[i]);
  }
  return s + "]";
}

// Callbacks de l'esclave I2C (tâche du pilote I2C) : section critique pour les registres.
static void emuI2cReceive(int n) {
  int k = 0;
  while (Wire.available()) {
    uint8_t b = Wire.read();
    if (!emuI2cPointer) continue;  // BH1750 & co : commandes ignorées, la lecture renvoie toujours la mesure
    portENTER_CRITICAL(&emuMux);
    if (k == 0) emuPtr = b & 3;
    else if (k <= 2) emuRegs[emuPtr][k - 1] = b;  // écriture de configuration relue ensuite par le DUT
    portEXIT_CRITICAL(&emuMux);
    k++;
  }
  (void)n;
}

static void emuI2cRequest() {
  uint8_t out[2];
  portENTER_CRITICAL(&emuMux);
  const uint8_t p = emuI2cPointer ? emuPtr : 0;
  out[0] = emuRegs[p][0];
  out[1] = emuRegs[p][1];
  portEXIT_CRITICAL(&emuMux);
  Wire.write(out, 2);
}

static void emuI2cSetOnline(bool on) {
  if (on == emuI2cOnline) return;
  if (on) {
    Wire.onReceive(emuI2cReceive);
    Wire.onRequest(emuI2cRequest);
    emuI2cOnline = Wire.begin(emuI2cAddr, WORKER_I2C_SDA, WORKER_I2C_SCL, 100000);
  } else {
    Wire.end();  // plus d'acquittement : le DUT croit le capteur débranché
    emuI2cOnline = false;
  }
}

static void emuRelease() {
  for (auto &c : emuCh) {
    if (c.kind == EMU_I2C) emuI2cSetOnline(false);
#if SOC_DAC_SUPPORTED
    else if (c.kind == EMU_ANALOG) dacDisable(c.pin);
#endif
    if (c.kind != EMU_NONE && c.kind != EMU_I2C) pinMode(c.pin, INPUT);
    c.kind = EMU_NONE;
    c.pin = -1;
  }
}

static void emuStop(const char *why) {
  if (!emuActive) return;
  emuRelease();
  emuActive = false;
  currentJob = "";
  state = "READY";
  lastResult = String("EMULATOR_STOPPED ") + why;
  logLine(lastResult);
}

// Applique une valeur brute : mV (analogique), 0/1 (numérique) ou 4 chiffres hexa (registre I2C).
static bool emuApply(uint8_t n, const String &value) {
  if (n >= EMU_MAX_CH) return false;
  EmuChannel &c = emuCh[n];
  if (value.startsWith("@")) {  // @0 / @1 : composant I2C débranché / rebranché
    if (c.kind != EMU_I2C) return false;
    emuI2cSetOnline(value.substring(1).toInt() != 0);
    return true;
  }
  switch (c.kind) {
    case EMU_ANALOG: {
#if SOC_DAC_SUPPORTED
      long mv = constrain(value.toInt(), 0L, 3300L);
      dacWrite(c.pin, static_cast<uint8_t>((mv * 255L + 1650L) / 3300L));
      return true;
#else
      return false;
#endif
    }
    case EMU_DIGITAL:
      digitalWrite(c.pin, value.toInt() ? HIGH : LOW);
      return true;
    case EMU_I2C: {
      if (value.length() != 4) return false;
      const uint16_t raw = static_cast<uint16_t>(strtoul(value.c_str(), nullptr, 16));
      portENTER_CRITICAL(&emuMux);
      emuRegs[0][0] = raw >> 8;
      emuRegs[0][1] = raw & 0xFF;
      portEXIT_CRITICAL(&emuMux);
      return true;
    }
    default:
      return false;
  }
}

// Rapport cyclique (%) mesuré sur quelques périodes ; 0 ou 100 si le signal ne bouge pas.
static float emuMeasureDuty(int pin) {
  uint32_t hi = 0, lo = 0;
  uint8_t ok = 0;
  for (uint8_t i = 0; i < 6; ++i) {
    const uint32_t h = pulseIn(pin, HIGH, 25000UL);
    const uint32_t l = pulseIn(pin, LOW, 25000UL);
    if (h && l) {
      hi += h;
      lo += l;
      ok++;
    }
  }
  if (!ok) return digitalRead(pin) ? 100.0f : 0.0f;
  return 100.0f * hi / static_cast<float>(hi + lo);
}

// POST /api/emu/setup  channels=n:kind:pin[:addr:pointer];…   (kind : analog, digital, i2c, level, duty)
static void handleEmuSetup() {
  if (serviceJobKind != SERVICE_NONE || state == "FLASHING") {
    server.send(409, "text/plain", "busy");
    return;
  }
  if (!server.hasArg("channels")) {
    server.send(400, "text/plain", "missing channels");
    return;
  }
  emuRelease();
  String spec = server.arg("channels");
  String error = "";
  int from = 0;
  while (from < static_cast<int>(spec.length()) && error.isEmpty()) {
    int end = spec.indexOf(';', from);
    if (end < 0) end = spec.length();
    String item = spec.substring(from, end);
    from = end + 1;
    if (item.isEmpty()) continue;
    String f[5];
    int nf = 0, p = 0;
    while (nf < 5) {
      int q = item.indexOf(':', p);
      f[nf++] = item.substring(p, q < 0 ? item.length() : q);
      if (q < 0) break;
      p = q + 1;
    }
    const int n = f[0].toInt(), pin = f[2].toInt();
    if (nf < 3 || n < 0 || n >= EMU_MAX_CH) {
      error = "bad channel " + item;
      break;
    }
    EmuChannel &c = emuCh[n];
    if (f[1] == "analog") {
      if (!benchPinAllowed(benchDacPins, pin)) error = "no DAC on GPIO" + String(pin);
      else c = {EMU_ANALOG, static_cast<int8_t>(pin)};
    } else if (f[1] == "digital") {
      if (!benchPinAllowed(benchDoutPins, pin)) error = "GPIO" + String(pin) + " not a bench output";
      else {
        c = {EMU_DIGITAL, static_cast<int8_t>(pin)};
        pinMode(pin, OUTPUT);
      }
    } else if (f[1] == "level" || f[1] == "duty") {
      if (!benchPinAllowed(benchDinPins, pin)) error = "GPIO" + String(pin) + " not a bench input";
      else {
        c = {f[1] == "level" ? EMU_LEVEL : EMU_DUTY, static_cast<int8_t>(pin)};
        pinMode(pin, INPUT_PULLDOWN);  // fil absent = 0 : une erreur de câblage se voit
      }
    } else if (f[1] == "i2c") {
      const int addr = nf > 3 ? f[3].toInt() : 0;
      if (addr < 0x08 || addr > 0x77) error = "bad I2C address";
      else {
        c = {EMU_I2C, static_cast<int8_t>(WORKER_I2C_SDA)};
        emuI2cAddr = static_cast<uint8_t>(addr);
        emuI2cPointer = nf <= 4 || f[4].toInt() != 0;
        portENTER_CRITICAL(&emuMux);
        memset(const_cast<uint8_t *>(&emuRegs[0][0]), 0, sizeof(emuRegs));
        emuPtr = 0;
        portEXIT_CRITICAL(&emuMux);
        Wire.end();  // le bus était peut-être en maître (scan I2C)
        emuI2cSetOnline(true);
        if (!emuI2cOnline) error = "I2C slave start failed";
      }
    } else {
      error = "unknown kind " + f[1];
    }
  }
  if (!error.isEmpty()) {
    emuRelease();
    server.send(400, "text/plain", error);
    return;
  }
  emuActive = true;
  emuLastCall = millis();
  state = "EMULATING";
  currentJob = "BENCH";
  progress = 0;
  lastResult = "EMULATOR_READY";
  logLine("EMULATOR READY " + spec);
  server.send(200, "text/plain", "ok");
}

// POST /api/emu/set  set=n:valeur;…   (valeur : mV, 0/1, hexa 4 chiffres, ou @0/@1 pour l'I2C)
static void handleEmuSet() {
  if (!emuActive) {
    server.send(409, "text/plain", "emulator not running");
    return;
  }
  emuLastCall = millis();
  String spec = server.arg("set");
  int from = 0;
  while (from < static_cast<int>(spec.length())) {
    int end = spec.indexOf(';', from);
    if (end < 0) end = spec.length();
    String item = spec.substring(from, end);
    from = end + 1;
    const int colon = item.indexOf(':');
    if (colon <= 0 || !emuApply(static_cast<uint8_t>(item.substring(0, colon).toInt()), item.substring(colon + 1))) {
      server.send(400, "text/plain", "bad value " + item);
      return;
    }
  }
  server.send(200, "text/plain", "ok");
}

// GET /api/emu/read → {"ch":[{"n":1,"level":1},{"n":2,"duty":24.8}]}
static void handleEmuRead() {
  if (!emuActive) {
    server.send(409, "text/plain", "emulator not running");
    return;
  }
  emuLastCall = millis();
  String json = "{\"i2c_online\":" + String(emuI2cOnline ? "true" : "false") + ",\"ch\":[";
  bool first = true;
  for (uint8_t n = 0; n < EMU_MAX_CH; ++n) {
    const EmuChannel &c = emuCh[n];
    if (c.kind != EMU_LEVEL && c.kind != EMU_DUTY) continue;
    if (!first) json += ',';
    first = false;
    json += "{\"n\":" + String(n);
    if (c.kind == EMU_LEVEL) json += ",\"level\":" + String(digitalRead(c.pin) ? 1 : 0) + "}";
    else json += ",\"duty\":" + String(emuMeasureDuty(c.pin), 1) + "}";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

static void handleEmuStop() {
  emuStop("by master");
  server.send(200, "text/plain", "ok");
}

// ---------------------------------------------------------------------------
// Panneau GPIO : lecture / écriture / PWM / tension, à distance depuis le MASTER.
// Seules les broches sûres de la puce sont accessibles (jamais la flash, la PSRAM, l'USB ou la console).
// ---------------------------------------------------------------------------

#if CONFIG_IDF_TARGET_ESP32
static const int8_t gpioSafe[] = {2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39};
#elif CONFIG_IDF_TARGET_ESP32S3
static const int8_t gpioSafe[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 47, 48};
#else
static const int8_t gpioSafe[] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
#endif
int8_t gpioPwmPin = -1;

static bool gpioAllowed(int pin) {
  for (int8_t p : gpioSafe)
    if (p == pin) return true;
  return false;
}

static String gpioStateJson(int pin) {
  String j = "{\"pin\":" + String(pin) + ",\"level\":" + String(digitalRead(pin));
  if (digitalPinToAnalogChannel(pin) >= 0) j += ",\"mv\":" + String(analogReadMilliVolts(pin));
  j += ",\"pwm\":" + String(pin == gpioPwmPin ? "true" : "false") + "}";
  return j;
}

// GET /api/gpio            → broches autorisées
// GET /api/gpio?pin=N      → {"pin":N,"level":0/1,"mv":…}
static void handleGpioGet() {
  if (!server.hasArg("pin")) {
    String j = "{\"chip\":\"" + String(ESP.getChipModel()) + "\",\"pins\":[";
    for (size_t i = 0; i < sizeof(gpioSafe); ++i) {
      if (i) j += ',';
      j += "{\"pin\":" + String(gpioSafe[i]) + ",\"adc\":" + String(digitalPinToAnalogChannel(gpioSafe[i]) >= 0 ? "true" : "false") + "}";
    }
    server.send(200, "application/json", j + "]}");
    return;
  }
  const int pin = server.arg("pin").toInt();
  if (!gpioAllowed(pin)) {
    server.send(400, "text/plain", "broche non autorisee");
    return;
  }
  server.send(200, "application/json", gpioStateJson(pin));
}

// POST /api/gpio  pin=N&mode=out|in|in_pullup|in_pulldown|pwm|release&value=0/1&freq=Hz&duty=%
static void handleGpioSet() {
  const int pin = server.arg("pin").toInt();
  const String mode = server.arg("mode");
  if (!gpioAllowed(pin)) {
    server.send(400, "text/plain", "broche non autorisee");
    return;
  }
  if (emuActive || state == "FLASHING") {
    server.send(409, "text/plain", "busy");
    return;
  }
  if (pin == gpioPwmPin && mode != "pwm") {
    ledcDetach(pin);
    gpioPwmPin = -1;
  }
  if (mode == "out") {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, server.arg("value").toInt() ? HIGH : LOW);
  } else if (mode == "in") {
    pinMode(pin, INPUT);
  } else if (mode == "in_pullup") {
    pinMode(pin, INPUT_PULLUP);
  } else if (mode == "in_pulldown") {
    pinMode(pin, INPUT_PULLDOWN);
  } else if (mode == "pwm") {
    const uint32_t freq = constrain(server.arg("freq").toInt(), 1L, 40000L);
    const float duty = constrain(server.arg("duty").toFloat(), 0.0f, 100.0f);
    if (gpioPwmPin >= 0 && gpioPwmPin != pin) ledcDetach(gpioPwmPin);  // une seule sortie PWM à la fois
    if (gpioPwmPin != pin && !ledcAttach(pin, freq, 10)) {
      server.send(500, "text/plain", "PWM indisponible");
      return;
    }
    if (gpioPwmPin == pin) ledcChangeFrequency(pin, freq, 10);
    gpioPwmPin = pin;
    ledcWrite(pin, static_cast<uint32_t>(duty * 1023.0f / 100.0f));
  } else if (mode == "release") {
    pinMode(pin, INPUT);
  } else {
    server.send(400, "text/plain", "mode inconnu");
    return;
  }
  logLine("GPIO" + String(pin) + " -> " + mode + (server.hasArg("value") ? " " + server.arg("value") : "") +
          (mode == "pwm" ? " " + server.arg("duty") + " %" : ""));
  server.send(200, "application/json", gpioStateJson(pin));
}

// ---------------------------------------------------------------------------
// Serveur web local du Worker
// ---------------------------------------------------------------------------

static void handleInfo() { server.send(200, "application/json", infoJson()); }

static const char *wifiAuthName(wifi_auth_mode_t t) {
  switch (t) {
    case WIFI_AUTH_OPEN: return "OPEN";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA";
    case WIFI_AUTH_WPA2_PSK: return "WPA2";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA/WPA2";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2-EAP";
    case WIFI_AUTH_WPA3_PSK: return "WPA3";
    case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2/WPA3";
    default: return "OTHER";
  }
}

static void handleScan() {
  if (serviceJobKind == SERVICE_WIFI_SCAN) {
    server.send(409, "application/json", "{\"state\":\"BUSY\"}");
    return;
  }
  int16_t count = WiFi.scanComplete();
  if (count == WIFI_SCAN_RUNNING) {
    server.send(200, "application/json", "{\"state\":\"RUNNING\"}");
    return;
  }
  if (server.hasArg("start") && (server.arg("start") == "1" || server.arg("start").equalsIgnoreCase("true"))) {
    WiFi.scanDelete();
    WiFi.scanNetworks(true, true, false, 250);
    server.send(202, "application/json", "{\"state\":\"RUNNING\"}");
    return;
  }
  if (count < 0) {
    server.send(200, "application/json", "{\"state\":\"IDLE\"}");
    return;
  }
  String json = String("{\"state\":\"DONE\",\"count\":") + count + ",\"networks\":[";
  for (int16_t i = 0; i < count; ++i) {
    if (i) json += ",";
    json += "{\"ssid\":\"" + jsonEscape(WiFi.SSID(i)) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + ",\"channel\":" +
            String(WiFi.channel(i)) + ",\"auth\":\"" + String(wifiAuthName(WiFi.encryptionType(i))) + "\"}";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

static void handleCapabilities() {
  const String emu = String(",\"emu\":{\"dac\":") + benchPinList(benchDacPins, sizeof(benchDacPins)) +
                     ",\"dout\":" + benchPinList(benchDoutPins, sizeof(benchDoutPins)) +
                     ",\"din\":" + benchPinList(benchDinPins, sizeof(benchDinPins)) + ",\"i2c_slave\":true}";
  const String caps = String("{\"protocol\":") + WORKER_PROTOCOL_VERSION + ",\"version\":\"" + LAB_VERSION +
                      "\",\"supports_resume\":true,\"supports_ota\":true,\"supports_cancel\":true,\"max_role_id\":10"
                      ",\"jobs\":[\"PING\",\"SYSTEM_TEST\",\"CHECKUP\",\"BENCHMARK\",\"FS_TEST\",\"I2C_SCAN\",\"WIFI_SCAN\","
                      "\"MEM_TEST\",\"IDENTIFY\"]"
                      ",\"features\":[\"OTA\",\"HEARTBEAT\",\"MEMORY\",\"RESET_REASON\",\"MDNS\",\"CANCEL\",\"TELEMETRY\","
                      "\"WIFI_SCAN\",\"STACK_HEALTH\",\"LITTLEFS_STATS\",\"CHECKPOINTS\",\"DISCOVERY\",\"BENCH_EMULATOR\",\"GPIO\"]" + emu + "}";
  server.send(200, "application/json", caps);
}

static void handleRoot() {
  static const char page[] PROGMEM = R"HTML(<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ESP32 LAB Worker</title><style>
:root{color-scheme:light dark;--bg:#f5f6f8;--card:#fff;--txt:#14171c;--mut:#667085;--line:#e4e7ec;--acc:#1f6feb;--ok:#12b76a;--bad:#f04438}
@media(prefers-color-scheme:dark){:root{--bg:#0e1116;--card:#161a21;--txt:#e8ebf0;--mut:#8b93a1;--line:#262c36;--acc:#4c8dff;--ok:#34d399;--bad:#f87171}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:760px;margin:auto;padding:16px}header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:8px 0 16px}
h1{font-size:18px;margin:0}.mut{color:var(--mut);font-size:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:12px}
.badge{font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;border:1px solid var(--line)}.bar{height:8px;background:var(--line);border-radius:99px;overflow:hidden;margin-top:10px}
.bar i{display:block;height:100%;background:var(--acc);transition:width .3s}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.k{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}.v{font-size:17px;font-weight:650;font-variant-numeric:tabular-nums}
.btns{display:flex;flex-wrap:wrap;gap:8px}button{font:inherit;font-weight:600;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--txt);cursor:pointer}
button.p{background:var(--acc);border-color:var(--acc);color:#fff}pre{white-space:pre-wrap;margin:0;font:12px ui-monospace,Consolas,monospace}
.net{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)}@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><div class="wrap"><header><div><h1 id="t">ESP32 LAB · Worker</h1><div class="mut" id="sub">connexion…</div></div><span class="badge" id="st">—</span></header>
<div class="card"><div style="display:flex;justify-content:space-between"><b id="job">Aucun job</b><span id="pct" class="mut">0 %</span></div><div class="bar"><i id="bi" style="width:0"></i></div>
<div class="btns" style="margin-top:14px"><button class="p" onclick="cmd('SYSTEM_TEST')">Check-up</button><button onclick="cmd('BENCHMARK')">Benchmark</button><button onclick="cmd('FS_TEST')">Test flash</button><button onclick="cmd('I2C_SCAN')">Scan I2C</button><button onclick="cmd('MEM_TEST')">Test mémoire</button><button onclick="cmd('IDENTIFY')">Identifier</button><button onclick="post('/api/cancel')">Annuler</button><button onclick="scan()">Radar Wi-Fi</button><button onclick="if(confirm('Redémarrer ?'))post('/api/reboot')">Redémarrer</button></div></div>
<div class="card grid"><div><div class="k">CPU</div><div class="v" id="cpu">—</div></div><div><div class="k">RAM libre</div><div class="v" id="heap">—</div></div><div><div class="k">Wi-Fi</div><div class="v" id="wifi">—</div></div><div><div class="k">Flash</div><div class="v" id="flash">—</div></div><div><div class="k">Uptime</div><div class="v" id="up">—</div></div><div><div class="k">Reset</div><div class="v" id="rr">—</div></div><div><div class="k">Jobs</div><div class="v" id="jd">—</div></div><div><div class="k">LittleFS</div><div class="v" id="fs">—</div></div></div>
<div class="card"><div class="k">Dernier résultat</div><pre id="res">—</pre></div><div class="card"><div class="k">Radar Wi-Fi</div><div id="radar" class="mut">Appuyez sur « Radar Wi-Fi ».</div></div></div>
<script>const $=i=>document.getElementById(i);const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function j(u,o){const r=await fetch(u,o);const t=await r.text();try{return JSON.parse(t)}catch(e){return{raw:t,status:r.status}}}
function dur(ms){let s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+' h '+m+' min':m?m+' min '+(s%60)+' s':s+' s'}
function draw(x){const p=x.progress||0;$('bi').style.width=p+'%';$('pct').textContent=p+' %';$('st').textContent=x.state;$('t').textContent='ESP32 LAB · W'+x.id;$('sub').textContent=x.ip+' · '+x.mac+' · v'+x.version+' · '+x.chip;$('job').textContent=x.job||'Aucun job';$('cpu').textContent=x.cpu_mhz+' MHz × '+x.cores;$('heap').textContent=Math.round(x.free_heap/1024)+' Ko';$('wifi').textContent=x.rssi+' dBm';$('flash').textContent=Math.round(x.flash_size/1048576)+' Mo';$('up').textContent=dur(x.uptime_ms);$('rr').textContent=x.reset_reason;$('jd').textContent=x.jobs_done;$('fs').textContent=Math.round(x.fs_used/1024)+'/'+Math.round(x.fs_total/1024)+' Ko';$('res').textContent=x.last_result||'—'}
async function refresh(){try{const x=await j('/api/info');if(x.id!==undefined)draw(x)}catch(e){}}
async function post(u,b){await j(u,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:b||''});refresh()}
function cmd(t){post('/api/job','type='+t+'&priority=60')}
async function scan(){let x=await j('/api/scan?start=1');for(let i=0;i<20&&(x.state==='RUNNING');i++){$('radar').textContent='Scan en cours…';await new Promise(r=>setTimeout(r,700));x=await j('/api/scan')}
if(x.networks){x.networks.sort((a,b)=>b.rssi-a.rssi);$('radar').innerHTML=x.networks.map(n=>'<div class="net"><span>'+(esc(n.ssid)||'<i>caché</i>')+'</span><span class="mut">'+n.rssi+' dBm · canal '+n.channel+' · '+esc(n.auth)+'</span></div>').join('')||'Aucun réseau'}else $('radar').textContent=JSON.stringify(x)}
refresh();setInterval(refresh,1000)</script></body></html>)HTML";
  server.send_P(200, "text/html; charset=utf-8", page);
}

static bool knownJob(const String &type) {
  return type == "SYSTEM_TEST" || type == "CHECKUP" || type == "BENCHMARK" || type == "FS_TEST" || type == "I2C_SCAN" ||
         type == "WIFI_SCAN" || type == "MEM_TEST" || type == "IDENTIFY";
}

static void handleJob() {
  if (!server.hasArg("type")) {
    server.send(400, "text/plain", "missing type");
    return;
  }
  if (state == "FLASHING" || serviceJobKind != SERVICE_NONE || emuActive) {
    server.send(409, "text/plain", "busy");
    return;
  }
  String type = server.arg("type");
  type.toUpperCase();
  int priority = server.hasArg("priority") ? server.arg("priority").toInt() : 5;

  if (type == "PING") {
    lastJob = millis();
    state = "READY";
    currentJob = "";
    progress = 100;
    jobsDone++;
    lastResult = "PONG RSSI=" + String(WiFi.RSSI()) + " HEAP=" + String(ESP.getFreeHeap());
    logLine("PONG");
    server.send(200, "text/plain", lastResult);
    return;
  }
  if (!knownJob(type)) {
    server.send(400, "text/plain", "unknown job");
    return;
  }
  startServiceJob(type, priority >= 70);
  server.send(202, "text/plain", "accepted");
}

static void handleCancel() {
  if (state == "FLASHING") {
    server.send(409, "text/plain", "OTA cannot be safely interrupted");
    return;
  }
  if (emuActive) {
    emuStop("cancelled");
    server.send(200, "text/plain", "emulator stopped");
    return;
  }
  if (serviceJobKind == SERVICE_NONE) {
    if (state == "ERROR") state = "READY";
    server.send(200, "text/plain", "idle");
    return;
  }
  cancelRequested = true;
  server.send(202, "text/plain", "cancelling");
}

static void handleFlash() {
  if (!server.hasArg("url") || !server.hasArg("sha256")) {
    server.send(400, "text/plain", "missing url/sha256");
    return;
  }
  if (serviceJobKind != SERVICE_NONE || state == "FLASHING" || emuActive) {
    server.send(409, "text/plain", "busy");
    return;
  }
  server.send(202, "text/plain", "accepted");
  flashFromMaster(server.arg("url"), server.arg("sha256"), server.arg("app") == "1");
}

static void handleReboot() {
  server.send(202, "text/plain", "rebooting");
  delay(150);
  ESP.restart();
}

static void receiveReply() {
  int n = udp.parsePacket();
  if (n <= 0) return;
  char buffer[400];
  int readLen = udp.read(buffer, sizeof(buffer) - 1);
  if (readLen <= 0) return;
  buffer[readLen] = 0;
  String packet(buffer);

  if (packet.startsWith("DISCOVER|")) {
    sendDiscovery();
  } else if (packet.startsWith("ASSIGN|")) {
    int p1 = packet.indexOf('|', 7);
    if (p1 < 0) return;
    int p2 = packet.indexOf('|', p1 + 1);
    int id = packet.substring(7, p1).toInt();
    if (id < 1 || id > 10) return;
    IPAddress ip;
    if (!ip.fromString(p2 > 0 ? packet.substring(p1 + 1, p2) : packet.substring(p1 + 1))) return;
    bool changed = workerId != static_cast<uint8_t>(id);
    workerId = static_cast<uint8_t>(id);
    masterIP = ip;
    if (changed) {
      prefs.begin("worker", false);
      prefs.putUChar("id", workerId);
      prefs.end();
      startNetworkSockets();
      logLine("Assigned W" + String(workerId) + " master=" + masterIP.toString());
    }
    if (serviceJobKind == SERVICE_NONE && !emuActive && state != "FLASHING" && state != "ERROR") state = "READY";
  } else if (packet.startsWith("APCFG|")) {
    int p1 = packet.indexOf('|', 6);
    if (p1 > 6) {
      String ssid = urlDecode(packet.substring(6, p1));
      String pass = urlDecode(packet.substring(p1 + 1));
      if (!ssid.isEmpty() && pass.length() >= 8 && pass.length() <= 63) {
        saveApCredentials(ssid, pass);
        state = "RECONNECTING";
        logLine("AP credentials saved; reconnecting to MASTER AP");
        WiFi.disconnect(true);
        lastReconnect = 0;
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
#if WORKER_LED_PIN >= 0
  pinMode(WORKER_LED_PIN, OUTPUT);
  digitalWrite(WORKER_LED_PIN, LOW);
#endif
  bootId = String(static_cast<unsigned long>(esp_random()), HEX);
  prefs.begin("worker", false);
  workerId = prefs.getUChar("id", DEFAULT_WORKER_ID);
  bootCount = prefs.getULong("boots", 0) + 1;
  prefs.putULong("boots", bootCount);
  prefs.end();

  fsMounted = LittleFS.begin(true);
  bool recovered = loadCheckpoint();
  remember("BOOT", String("worker online reset=") + resetReasonName(esp_reset_reason()));
  Serial.printf("\nESP32 LAB Worker %s — W%u — core %s%s\n", LAB_VERSION, workerId, ESP.getCoreVersion(),
                recovered ? " — reprise disponible" : "");

  connectLabWifi();
  if (WiFi.status() == WL_CONNECTED) {
    startNetworkSockets();
    startResumeIfNeeded();
    if (serviceJobKind == SERVICE_NONE) state = "DISCOVERING";
    logLine("WiFi " + WiFi.localIP().toString());
    sendDiscovery();
  } else {
    state = "OFFLINE";
    Serial.println("Point d'accès du MASTER introuvable ; nouvelle tentative toutes les 15 s.");
  }

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/info", HTTP_GET, handleInfo);
  server.on("/api/capabilities", HTTP_GET, handleCapabilities);
  server.on("/api/scan", HTTP_GET, handleScan);
  server.on("/api/job", HTTP_POST, handleJob);
  server.on("/api/cancel", HTTP_POST, handleCancel);
  server.on("/api/flash", HTTP_POST, handleFlash);
  server.on("/api/reboot", HTTP_POST, handleReboot);
  server.on("/api/emu/setup", HTTP_POST, handleEmuSetup);
  server.on("/api/emu/set", HTTP_POST, handleEmuSet);
  server.on("/api/emu/read", HTTP_GET, handleEmuRead);
  server.on("/api/emu/stop", HTTP_POST, handleEmuStop);
  server.on("/api/gpio", HTTP_GET, handleGpioGet);
  server.on("/api/gpio", HTTP_POST, handleGpioSet);
  server.begin();
}

void loop() {
  server.handleClient();
  receiveReply();
  startResumeIfNeeded();
  serviceJobs();
  if (emuActive && millis() - emuLastCall > BENCH_IDLE_TIMEOUT_MS) emuStop("idle timeout");

  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastReconnect > 15000UL) {
      lastReconnect = millis();
      state = "RECONNECTING";
      connectLabWifi();
      if (WiFi.status() == WL_CONNECTED) {
        startNetworkSockets();
        startResumeIfNeeded();
        if (serviceJobKind == SERVICE_NONE) state = "DISCOVERING";
        sendDiscovery();
      } else {
        state = "OFFLINE";
      }
    }
  } else {
    // Le Wi-Fi s'est reconnecté seul (MASTER redémarré) : on ne reste pas bloqué en OFFLINE/RECONNECTING.
    if (state == "OFFLINE" || state == "RECONNECTING") {
      startNetworkSockets();
      state = emuActive ? "EMULATING" : (serviceJobKind == SERVICE_NONE) ? (workerId ? "READY" : "DISCOVERING") : "TESTING";
      sendDiscovery();
      lastDiscovery = millis();
    }
    if (millis() - lastDiscovery > DISCOVERY_INTERVAL_MS) {
      sendDiscovery();
      lastDiscovery = millis();
    }
    if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
      sendHeartbeat();
      lastHeartbeat = millis();
    }
  }
  delay(2);
}
