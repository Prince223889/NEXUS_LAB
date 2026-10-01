#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "esp_err.h"
#include "cJSON.h"

#define WSTATE_MAX 16

typedef struct {
    bool seen;
    uint8_t id;
    char mac[18];
    char ip[16];
    char label[24];
    char state[WSTATE_MAX];
    char version[16];
    char job[24];
    char checkpoint_type[16];
    char last_result[128];
    uint32_t progress;
    uint32_t heap;
    uint32_t heap_min;
    uint32_t uptime_ms;
    uint32_t flash_size;
    uint32_t psram_size;
    int32_t rssi;
    uint16_t cpu_mhz;
    uint8_t cores;
    uint8_t checkpoint_phase;
    bool resume_available;
    uint32_t checkpoint_progress;
    uint32_t hb_count;
    int64_t first_seen_ms;
    int64_t last_seen_ms;
    int64_t last_assign_ms;
} worker_info_t;

void worker_pool_start(void);
/* Copie thread-safe des workers connus ; renvoie le nombre copié. */
size_t worker_pool_snapshot(worker_info_t *out, size_t max);
bool worker_pool_get_copy(uint8_t id, worker_info_t *out);
size_t worker_pool_count(void);
size_t worker_pool_online(void);
void worker_pool_to_json(cJSON *arr, bool detailed);

esp_err_t worker_send_job(uint8_t id, const char *type, int priority, char *resp, size_t resp_cap);
esp_err_t worker_cancel_job(uint8_t id);
/* as_project = false : mise à jour du firmware worker ; true : charge un projet utilisateur dans l'autre
 * partition OTA en conservant le worker (retour possible par BOOT 3 s ou worker_go_home). */
esp_err_t worker_flash(uint8_t id, const char *sd_path, bool as_project);
/* Le MASTER autorise un flash du Pi ; le worker télécharge directement le firmware signé. */
esp_err_t worker_flash_remote(uint8_t id, const char *url, const char *sha256, bool as_project);
/* Demande à un worker qui exécute un projet de revenir au firmware worker (UDP 4215 « LAB|HOME »). */
esp_err_t worker_go_home(uint8_t id);
esp_err_t worker_reboot(uint8_t id);
esp_err_t worker_set_label(uint8_t id, const char *label);
esp_err_t worker_forget(uint8_t id);
/* GET http://<worker>/<path> ; le corps est renvoyé dans `out` (terminé par 0). */
esp_err_t worker_http_get(uint8_t id, const char *path, char *out, size_t cap, int *status);
/* POST application/x-www-form-urlencoded vers http://<worker>/<path> ; ESP_FAIL si le statut n'est pas 2xx. */
esp_err_t worker_http_post(uint8_t id, const char *path, const char *form, int timeout_ms, char *out, size_t cap, int *status);
esp_err_t worker_refresh_result(uint8_t id);
void worker_pool_push_ap_config(void);
void worker_pool_discover(void);
/* Marque le worker comme occupé localement (avant le prochain heartbeat). */
void worker_pool_mark(uint8_t id, const char *state, const char *job);
/* Journal en direct (UDP 4212) : lignes de seq > since, d'un worker (id) ou de tous (0) ; renvoie le dernier seq. */
uint32_t worker_log_json(cJSON *arr, uint8_t id, uint32_t since);
