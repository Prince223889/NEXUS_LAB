#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"

#define LAB_VERSION        "6.1.0"
#define LAB_CODENAME       "NEXUS"
#define LAB_NAME           "ESP32 LAB"

/* ---------- Valeurs par défaut (modifiables depuis l'interface admin) ---------- */
#define DEFAULT_AP_SSID        "ESP32-LAB"
#define DEFAULT_AP_PASSWORD    "ESP32-LAB-Setup2026!"   /* identique au Worker (config.h) */
#define DEFAULT_AP_CHANNEL     1
#define DEFAULT_HOSTNAME       "esp32-lab"
#define DEFAULT_AI_MODEL       "gpt-4o-mini"
#define DEFAULT_NTP_SERVER     "pool.ntp.org"
#define DEFAULT_TIMEZONE       "GMT0"                   /* chaîne POSIX TZ, ex. "CET-1CEST,M3.5.0,M10.5.0/3" */

/* ---------- Capacités ---------- */
#define WORKER_MAX             10
#define JOB_MAX                32
#define SESSION_MAX            4
#define SENSOR_FEED_MAX        32

/* ---------- Brochage MASTER (YD-ESP32-S3 N16R8 / DevKitC-1) ---------- */
#define DEFAULT_DHT_GPIO       4
#define DEFAULT_DHT_TYPE       11                       /* 11 = DHT11, 22 = DHT22/AM2302 */
#define SD_CS_GPIO             10
#define SD_MOSI_GPIO           11
#define SD_SCK_GPIO            12
#define SD_MISO_GPIO           13
#define RGB_GPIO_V10           48                       /* DevKitC-1 v1.0 */
#define RGB_GPIO_V11           38                       /* DevKitC-1 v1.1 */
#define RGB_GPIO_YD_ESP32_23   48                       /* YD-ESP32-S3 (pont "RGB" soudé) */
#define BOOT_BUTTON_GPIO       0
#define USB_HOST_VBUS_EN_GPIO  (-1)                     /* GPIO qui active le 5 V VBUS, -1 si câblé en dur */

/* ---------- Réseau ---------- */
#define AP_IP_STR              "192.168.4.1"
#define DISCOVERY_PORT         4211
#define LOG_PORT               4212
#define SENSOR_FEED_PORT       4213
#define HTTP_PORT              80

/* ---------- Temporisations ---------- */
#define UPDATE_INTERVAL_MS          (6UL * 60UL * 60UL * 1000UL)
#define WORKER_HEARTBEAT_TIMEOUT_MS 10000UL
#define WORKER_STALE_REASSIGN_MS    (5UL * 60UL * 1000UL)
#define WEB_SESSION_MS              (60UL * 60UL * 1000UL)
#define STORAGE_IMPORT_INTERVAL_MS  10000UL
#define MAX_UPLOAD_BYTES            (8UL * 1024UL * 1024UL)
#define MAX_PROJECT_PATH_BYTES      512

typedef struct {
    char ap_ssid[33];
    char ap_pass[65];
    uint8_t ap_channel;
    char sta_ssid[33];
    char sta_pass[65];
    char hostname[32];
    char admin_pass[65];
    char control_path[65];
    char whatsapp_phone[32];
    char whatsapp_api[128];
    char webhook_url[192];
    char ai_endpoint[192];
    char ai_key[200];
    char ai_model[64];
    char search_endpoint[192];
    char update_manifest[192];
    char github_repo[80];      /* dépôt GitHub « utilisateur/depot » pour les mises à jour par Releases */
    char ntp_server[64];
    char timezone[64];
    bool auto_updates;
    bool espnow_enabled;
    bool captive_portal;
    int rgb_gpio;              /* -1 = LED désactivée */
    char board_variant[24];
    int dht_gpio;              /* -1 = capteur désactivé */
    uint8_t dht_type;          /* 11 ou 22 */
} lab_config_t;

extern lab_config_t g_lab_cfg;

void lab_config_load(lab_config_t *cfg);
esp_err_t lab_config_save(const lab_config_t *cfg);
esp_err_t lab_config_factory_reset(void);
/* Vérifie un lab_config_t candidat ; renvoie NULL si valide, sinon un message d'erreur (français). */
const char *lab_config_validate(const lab_config_t *cfg);
void lab_config_print_credentials(void);
