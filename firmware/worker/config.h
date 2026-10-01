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

// Jobs « matériel » : ADC_READ, GPIO_TEST, PWM_GEN, SERVO_SWEEP, TONE_TEST, ONEWIRE_SCAN, LOGIC_SAMPLE.
// Les jobs du MASTER ne portent pas de paramètres : broches et réglages sont fixés ici.
// Chaque broche doit figurer dans les broches sûres du worker (gpioSafe dans worker.ino : jamais la flash,
// la PSRAM, l'USB, la console ni une broche de démarrage), sinon le job est refusé (PIN_REFUSED).
// Les valeurs par défaut évitent aussi la LED, le bus I2C et le connecteur du banc fantôme ci-dessus.
#if CONFIG_IDF_TARGET_ESP32
#define WORKER_PWM_PIN 13                 // générateur de signal (PWM_GEN)
#define WORKER_SERVO_PIN 27               // servomoteur (SERVO_SWEEP) : pas d'impulsion parasite au démarrage
#define WORKER_TONE_PIN 14                // buzzer passif (TONE_TEST)
#define WORKER_ONEWIRE_PIN 32             // bus 1-Wire (ONEWIRE_SCAN) : résistance de 4,7 kΩ vers 3V3 conseillée
#define WORKER_LOGIC_PINS {33, 34, 35, 36}  // analyseur logique (LOGIC_SAMPLE) : entrées seules
#elif CONFIG_IDF_TARGET_ESP32S3
#define WORKER_PWM_PIN 10
#define WORKER_SERVO_PIN 11
#define WORKER_TONE_PIN 12
#define WORKER_ONEWIRE_PIN 13
#define WORKER_LOGIC_PINS {14, 17, 18, 21}
#else
// ESP32-C3 & co : peu de broches libres, PWM/servo/buzzer partagent GPIO10 (jamais en même temps).
#define WORKER_PWM_PIN 10
#define WORKER_SERVO_PIN 10
#define WORKER_TONE_PIN 10
#define WORKER_ONEWIRE_PIN 3
#define WORKER_LOGIC_PINS {0, 1, 3, 10}
#endif
#define WORKER_ADC_SAMPLES 16             // ADC_READ : moyenne de N mesures par broche (ADC1 uniquement, ADC2 gêné par le Wi-Fi)
#define WORKER_PWM_FREQ_HZ 1000UL         // PWM_GEN : fréquence
#define WORKER_PWM_DUTY_PCT 50            // PWM_GEN : rapport cyclique (%)
#define WORKER_PWM_DURATION_MS 10000UL    // PWM_GEN : durée du signal, broche relâchée ensuite
#define WORKER_SERVO_MIN_US 500           // SERVO_SWEEP : impulsion à 0°
#define WORKER_SERVO_MAX_US 2500          // SERVO_SWEEP : impulsion à 180°
#define WORKER_SERVO_STEP_DEG 5           // SERVO_SWEEP : pas du balayage 0 → 180 → 0
#define WORKER_SERVO_STEP_MS 50UL
#define WORKER_TONE_FROM_HZ 200UL         // TONE_TEST : balayage de fréquence
#define WORKER_TONE_TO_HZ 4000UL
#define WORKER_TONE_STEPS 20
#define WORKER_TONE_STEP_MS 150UL
#define WORKER_ONEWIRE_MAX 8              // ONEWIRE_SCAN : nombre maximal de composants listés
#define WORKER_LOGIC_RATE_HZ 20000UL      // LOGIC_SAMPLE : échantillonnage (signaux jusqu'à ~10 kHz)
#define WORKER_LOGIC_WINDOW_MS 1000UL     // LOGIC_SAMPLE : durée de la capture (par tranches de 100 ms)
