#pragma once

// ---------------------------------------------------------------------------
// ESP32 LAB — Worker (Arduino-ESP32 3.3.x)
// Réglages communs à toutes les cartes Worker. Le MASTER attribue W1..W10.
// ---------------------------------------------------------------------------

#define LAB_VERSION "6.1.0"
#define WORKER_PROTOCOL_VERSION 3
#define DEFAULT_WORKER_ID 0
#define WORKER_NAME "ESP32-LAB-WORKER"

// Point d'accès du MASTER (identique à DEFAULT_AP_* dans firmware/master/main/lab_config.h).
// Si vous changez le mot de passe depuis le dashboard, le MASTER le pousse aux Workers connectés.
#define LAB_AP_SSID "ESP32-LAB"
#define LAB_AP_PASSWORD "ESP32-LAB-Setup2026!"

#define DISCOVERY_PORT 4211
#define LOG_UDP_PORT 4212
#define DISCOVERY_INTERVAL_MS 2500UL
#define HEARTBEAT_INTERVAL_MS 1000UL
#define JOB_TIMEOUT_MS 120000UL
#define OTA_IDLE_TIMEOUT_MS 30000UL
#define OTA_HTTP_TIMEOUT_MS 30000U
#define MAX_UPLOAD_BYTES (4UL * 1024UL * 1024UL)
#define FS_TEST_BYTES 8192U
#define BENCHMARK_OPERATIONS 180000UL
#define CHECKPOINT_INTERVAL_MS 3000UL
#define CHECKPOINT_PROGRESS_STEP 10UL

// LED utilisée par le job IDENTIFY (GPIO2 sur la plupart des ESP32 DevKit ; -1 pour désactiver).
#define WORKER_LED_PIN 2
// Bus I2C utilisé par le job I2C_SCAN : broches par défaut de la carte choisie dans l'IDE
// (ESP32 DevKit : SDA=21 SCL=22 ; ESP32-S3 : SDA=8 SCL=9 ; ESP32-C3 : SDA=8 SCL=9).
#define WORKER_I2C_SDA SDA
#define WORKER_I2C_SCL SCL

// Banc fantôme : connecteur du worker « émulateur » (identique à LAB.BENCH dans catalog/src/12_bench.js).
// Seules ces broches peuvent être pilotées ou lues à distance ; l'esclave I2C utilise WORKER_I2C_SDA/SCL.
#if CONFIG_IDF_TARGET_ESP32
#define BENCH_DAC_PINS {25, 26}          // sorties analogiques (DAC 8 bits) : ESP32 classique uniquement
#define BENCH_DOUT_PINS {16, 17, 4}      // capteurs tout-ou-rien simulés
#define BENCH_DIN_PINS {18, 19, 23}      // actionneurs observés (niveau ou rapport cyclique)
#elif CONFIG_IDF_TARGET_ESP32S3
#define BENCH_DAC_PINS {-1}          // -1 : aucune (pas de DAC sur cette puce)
#define BENCH_DOUT_PINS {4, 5, 6}
#define BENCH_DIN_PINS {7, 15, 16}
#else
#define BENCH_DAC_PINS {-1}          // -1 : aucune (pas de DAC sur cette puce)
#define BENCH_DOUT_PINS {4, 5}
#define BENCH_DIN_PINS {6, 7}
#endif
#define BENCH_IDLE_TIMEOUT_MS 120000UL   // sans ordre du MASTER pendant ce délai, l'émulateur s'arrête seul
