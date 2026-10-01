#include "worker_pool.h"
#include "lab_config.h"
#include "event_log.h"
#include "led_status.h"
#include "netmon.h"
#include "ota_manager.h"
#include "storage.h"
#include "esp_check.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_random.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "lwip/inet.h"
#include "lwip/sockets.h"
#include "nvs.h"
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

static const char *TAG = "workers";
static worker_info_t w[WORKER_MAX];
static SemaphoreHandle_t s_mx = NULL;

#define LOCK()   xSemaphoreTake(s_mx, portMAX_DELAY)
#define UNLOCK() xSemaphoreGive(s_mx)

static int64_t now_ms(void) { return esp_timer_get_time() / 1000LL; }

/* ---------- accès protégés ---------- */

static worker_info_t *byid_locked(int id)
{
    for (int i = 0; i < WORKER_MAX; i++)
        if (w[i].seen && w[i].id == id) return &w[i];
    return NULL;
}

static worker_info_t *bymac_locked(const char *mac)
{
    for (int i = 0; i < WORKER_MAX; i++)
        if (w[i].seen && strcasecmp(w[i].mac, mac) == 0) return &w[i];
    return NULL;
}

size_t worker_pool_count(void)
{
    size_t n = 0;
    LOCK();
    for (int i = 0; i < WORKER_MAX; i++) if (w[i].seen) n++;
    UNLOCK();
    return n;
}

size_t worker_pool_online(void)
{
    size_t n = 0;
    LOCK();
    for (int i = 0; i < WORKER_MAX; i++) if (w[i].seen && strcmp(w[i].state, "OFFLINE") != 0) n++;
    UNLOCK();
    return n;
}

size_t worker_pool_snapshot(worker_info_t *out, size_t max)
{
    size_t n = 0;
    if (!out) return 0;
    LOCK();
    for (int i = 0; i < WORKER_MAX && n < max; i++) if (w[i].seen) out[n++] = w[i];
    UNLOCK();
    /* tri par identifiant pour un affichage stable */
    for (size_t a = 1; a < n; ++a) {
        worker_info_t t = out[a];
        size_t b = a;
        while (b > 0 && out[b - 1].id > t.id) { out[b] = out[b - 1]; b--; }
        out[b] = t;
    }
    return n;
}

bool worker_pool_get_copy(uint8_t id, worker_info_t *out)
{
    bool ok = false;
    LOCK();
    worker_info_t *x = byid_locked(id);
    if (x && out) { *out = *x; ok = true; }
    UNLOCK();
    return ok;
}

void worker_pool_mark(uint8_t id, const char *state, const char *job)
{
    LOCK();
    worker_info_t *x = byid_locked(id);
    if (x) {
        if (state) strlcpy(x->state, state, sizeof(x->state));
        if (job) strlcpy(x->job, job, sizeof(x->job));
    }
    UNLOCK();
}

static void load_label(worker_info_t *x)
{
    char key[16];
    char mac12[13] = {0};
    size_t k = 0;
    for (const char *p = x->mac; *p && k < 12; ++p) if (isxdigit((unsigned char)*p)) mac12[k++] = (char)tolower((unsigned char)*p);
    snprintf(key, sizeof(key), "l%s", mac12);
    nvs_handle_t h;
    if (nvs_open("wlabels", NVS_READONLY, &h) == ESP_OK) {
        size_t len = sizeof(x->label);
        if (nvs_get_str(h, key, x->label, &len) != ESP_OK) x->label[0] = 0;
        nvs_close(h);
    }
}

void worker_pool_to_json(cJSON *arr, bool detailed)
{
    if (!arr) return;
    worker_info_t *snap = calloc(WORKER_MAX, sizeof(worker_info_t));
    if (!snap) return;
    size_t n = worker_pool_snapshot(snap, WORKER_MAX);
    int64_t t = now_ms();
    for (size_t i = 0; i < n; i++) {
        const worker_info_t *x = &snap[i];
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddNumberToObject(o, "id", x->id);
        cJSON_AddStringToObject(o, "label", x->label);
        cJSON_AddStringToObject(o, "mac", x->mac);
        cJSON_AddStringToObject(o, "ip", x->ip);
        cJSON_AddStringToObject(o, "state", x->state);
        cJSON_AddStringToObject(o, "version", x->version);
        cJSON_AddStringToObject(o, "job", x->job);
        cJSON_AddNumberToObject(o, "progress", x->progress);
        cJSON_AddNumberToObject(o, "heap", x->heap);
        cJSON_AddNumberToObject(o, "rssi", x->rssi);
        cJSON_AddNumberToObject(o, "uptime_ms", x->uptime_ms);
        cJSON_AddNumberToObject(o, "age_ms", (double)(t - x->last_seen_ms));
        cJSON_AddBoolToObject(o, "resume_available", x->resume_available);
        cJSON_AddNumberToObject(o, "checkpoint_progress", x->checkpoint_progress);
        if (detailed) {
            cJSON_AddNumberToObject(o, "heap_min", x->heap_min);
            cJSON_AddNumberToObject(o, "cpu_mhz", x->cpu_mhz);
            cJSON_AddNumberToObject(o, "cores", x->cores);
            cJSON_AddNumberToObject(o, "flash_size", x->flash_size);
            cJSON_AddNumberToObject(o, "psram_size", x->psram_size);
            cJSON_AddStringToObject(o, "checkpoint_type", x->checkpoint_type);
            cJSON_AddNumberToObject(o, "checkpoint_phase", x->checkpoint_phase);
            cJSON_AddStringToObject(o, "last_result", x->last_result);
            cJSON_AddNumberToObject(o, "hb_count", x->hb_count);
        }
        cJSON_AddItemToArray(arr, o);
    }
    free(snap);
}

/* ---------- découpe qui conserve les champs vides (strtok_r les fusionne) ---------- */
static int split_fields(char *s, char **fields, int max)
{
    int n = 0;
    while (s && n < max) {
        fields[n++] = s;
        char *bar = strchr(s, '|');
        if (!bar) break;
        *bar = 0;
        s = bar + 1;
    }
    return n;
}

static void copy_clean(char *dst, size_t cap, const char *src)
{
    size_t o = 0;
    for (; src && *src && o + 1 < cap; ++src) {
        unsigned char c = (unsigned char)*src;
        dst[o++] = (c < 0x20 || c == 0x7F) ? ' ' : (char)c;
    }
    dst[o] = 0;
}

static bool ip_valid(const char *ip)
{
    struct in_addr a;
    return ip && inet_aton(ip, &a) != 0;
}

/* ---------- UDP ---------- */

static void send_packet(const char *msg, const char *ip, int port)
{
    int s = socket(AF_INET, SOCK_DGRAM, IPPROTO_IP);
    if (s < 0) return;
    int b = 1;
    setsockopt(s, SOL_SOCKET, SO_BROADCAST, &b, sizeof(b));
    struct sockaddr_in a = {0};
    a.sin_family = AF_INET;
    a.sin_port = htons(port);
    a.sin_addr.s_addr = ip ? inet_addr(ip) : inet_addr("192.168.4.255");
    sendto(s, msg, strlen(msg), 0, (struct sockaddr *)&a, sizeof(a));
    close(s);
    uint8_t proto = !strncmp(msg, "ASSIGN", 6) ? NM_ASSIGN : !strncmp(msg, "DISCOVER", 8) ? NM_DISCOVER
                    : !strncmp(msg, "LAB|HOME", 8) ? NM_HOME : NM_OTHER;
    netmon_record(NM_TX, proto, 0, ip, (uint16_t)strlen(msg), "%s", msg);
}

static int new_id_locked(void)
{
    for (int id = 1; id <= WORKER_MAX; id++) if (!byid_locked(id)) return id;
    const int64_t t = now_ms();
    int victim = -1;
    int64_t oldest = INT64_MAX;
    for (int i = 0; i < WORKER_MAX; i++) {
        if (w[i].seen && !strcmp(w[i].state, "OFFLINE") && t - w[i].last_seen_ms > (int64_t)WORKER_STALE_REASSIGN_MS &&
            w[i].last_seen_ms < oldest) {
            victim = i;
            oldest = w[i].last_seen_ms;
        }
    }
    if (victim >= 0) {
        int id = w[victim].id;
        memset(&w[victim], 0, sizeof(w[victim]));
        return id;
    }
    return -1;
}

static void handle_hello(char **f, int n)
{
    /* HELLO|MAC|VERSION|IP[|PROTO] */
    if (n < 4 || strlen(f[1]) < 11 || !ip_valid(f[3])) return;
    char assign_ip[16] = {0};
    int assign_id = -1;
    bool is_new = false;
    LOCK();
    worker_info_t *x = bymac_locked(f[1]);
    if (!x) {
        int id = new_id_locked();
        if (id > 0) {
            for (int i = 0; i < WORKER_MAX; i++) {
                if (!w[i].seen) {
                    x = &w[i];
                    memset(x, 0, sizeof(*x));
                    x->seen = true;
                    x->id = (uint8_t)id;
                    x->first_seen_ms = now_ms();
                    copy_clean(x->mac, sizeof(x->mac), f[1]);
                    strlcpy(x->state, "READY", sizeof(x->state));
                    load_label(x);
                    is_new = true;
                    break;
                }
            }
        }
    }
    if (x) {
        copy_clean(x->ip, sizeof(x->ip), f[3]);
        copy_clean(x->version, sizeof(x->version), f[2]);
        x->last_seen_ms = now_ms();
        if (!strcmp(x->state, "OFFLINE")) strlcpy(x->state, "READY", sizeof(x->state));
        if (x->last_assign_ms == 0 || x->last_seen_ms - x->last_assign_ms > 15000) {
            x->last_assign_ms = x->last_seen_ms;
            strlcpy(assign_ip, x->ip, sizeof(assign_ip));
            assign_id = x->id;
        }
    }
    UNLOCK();
    if (is_new && x) evlog_add('S', "fleet", "nouveau worker W%d (%s, v%s)", x->id, f[1], f[2]);
    if (assign_id > 0) {
        char msg[64];
        snprintf(msg, sizeof(msg), "ASSIGN|%d|" AP_IP_STR, assign_id);
        send_packet(msg, assign_ip, DISCOVERY_PORT);
    }
}

static void handle_hb(char **f, int n)
{
    /* HB|ID|MAC|STATE|PROGRESS|UPTIME|FREE_HEAP|IP|JOB|RSSI|CPU_MHZ|HEAP_MIN|FLASH_SIZE|CORES|PSRAM_SIZE|
     *    RESUME_PENDING|CHECKPOINT_PROGRESS|CHECKPOINT_TYPE|CHECKPOINT_PHASE */
    if (n < 9) return;
    int id = atoi(f[1]);
    if (id <= 0 || id > WORKER_MAX) return;
    bool back_online = false;
    LOCK();
    worker_info_t *x = byid_locked(id);
    if (x && strcasecmp(x->mac, f[2]) == 0) {
        back_online = !strcmp(x->state, "OFFLINE");
        /* un worker qui envoie un battement est joignable, quel que soit l'état qu'il annonce */
        if (!strcmp(f[3], "OFFLINE") || !strcmp(f[3], "RECONNECTING") || !f[3][0]) strlcpy(x->state, "READY", sizeof(x->state));
        else copy_clean(x->state, sizeof(x->state), f[3]);
        x->progress = (uint32_t)strtoul(f[4], NULL, 10);
        if (x->progress > 100) x->progress = 100;
        x->uptime_ms = (uint32_t)strtoul(f[5], NULL, 10);
        x->heap = (uint32_t)strtoul(f[6], NULL, 10);
        if (ip_valid(f[7])) copy_clean(x->ip, sizeof(x->ip), f[7]);
        copy_clean(x->job, sizeof(x->job), f[8]);
        if (n > 9) x->rssi = (int32_t)atoi(f[9]);
        if (n > 10) x->cpu_mhz = (uint16_t)atoi(f[10]);
        if (n > 11) x->heap_min = (uint32_t)strtoul(f[11], NULL, 10);
        if (n > 12) x->flash_size = (uint32_t)strtoul(f[12], NULL, 10);
        if (n > 13) x->cores = (uint8_t)atoi(f[13]);
        if (n > 14) x->psram_size = (uint32_t)strtoul(f[14], NULL, 10);
        if (n > 15) x->resume_available = atoi(f[15]) != 0;
        if (n > 16) x->checkpoint_progress = (uint32_t)strtoul(f[16], NULL, 10);
        if (n > 17) copy_clean(x->checkpoint_type, sizeof(x->checkpoint_type), f[17]);
        if (n > 18) x->checkpoint_phase = (uint8_t)atoi(f[18]);
        x->hb_count++;
        x->last_seen_ms = now_ms();
    } else {
        x = NULL;
    }
    UNLOCK();
    if (x && back_online) evlog_add('I', "fleet", "W%d de retour en ligne", id);
}

static bool worker_ip(uint8_t id, char ip[16], bool require_online);

static void handle_app(char **f, int n)
{
    /* APP|MAC|nom_du_projet|IP : un worker exécute un projet chargé depuis le MASTER (retour possible) */
    if (n < 4 || !ip_valid(f[3])) return;
    bool changed = false;
    int id = 0;
    LOCK();
    worker_info_t *x = bymac_locked(f[1]);
    if (x) {
        changed = strcmp(x->state, "PROJECT") != 0;
        strlcpy(x->state, "PROJECT", sizeof(x->state));
        copy_clean(x->job, sizeof(x->job), f[2]);
        copy_clean(x->ip, sizeof(x->ip), f[3]);
        x->progress = 0;
        x->last_seen_ms = now_ms();
        id = x->id;
    }
    UNLOCK();
    if (changed && id) evlog_add('I', "fleet", "W%d exécute le projet « %s »", id, f[2]);
}

esp_err_t worker_go_home(uint8_t id)
{
    char ip[16];
    if (!worker_ip(id, ip, true)) return ESP_ERR_NOT_FOUND;
    for (int i = 0; i < 3; i++) send_packet("LAB|HOME", ip, 4215); /* UDP : répété pour fiabilité */
    evlog_add('I', "fleet", "W%d : retour au mode worker demandé", id);
    return ESP_OK;
}

static void parse_packet(char *p, const char *ip, int len)
{
    char raw[64];
    strlcpy(raw, p, sizeof(raw));  /* copie avant que split_fields ne remplace les '|' par des 0 */
    char *f[24];
    int n = split_fields(p, f, 24);
    if (n < 1) return;
    if (!strcmp(f[0], "HELLO")) {
        handle_hello(f, n);
        netmon_record(NM_RX, NM_HELLO, 0, ip, len, "MAC %s v%s", n > 1 ? f[1] : "?", n > 2 ? f[2] : "?");
    } else if (!strcmp(f[0], "HB")) {
        handle_hb(f, n);
        uint8_t id = (uint8_t)(n > 1 ? atoi(f[1]) : 0);
        netmon_note_heartbeat(id, now_ms());
        netmon_record(NM_RX, NM_HB, id, ip, len, "état %s prog %s RAM %s",
                      n > 3 ? f[3] : "?", n > 4 ? f[4] : "?", n > 6 ? f[6] : "?");
    } else if (!strcmp(f[0], "APP")) {
        handle_app(f, n);
        netmon_record(NM_RX, NM_APP, 0, ip, len, "projet %s", n > 2 ? f[2] : "?");
    } else if (!strcmp(f[0], "DISCOVER")) {
        netmon_record(NM_RX, NM_DISCOVER, 0, ip, len, "%s", raw);
    } else {
        netmon_record(NM_RX, NM_OTHER, 0, ip, len, "%s", raw);
    }
}

static void rx_task(void *arg)
{
    (void)arg;
    int s = socket(AF_INET, SOCK_DGRAM, IPPROTO_IP);
    if (s < 0) { vTaskDelete(NULL); return; }
    struct sockaddr_in a = {0};
    a.sin_family = AF_INET;
    a.sin_port = htons(DISCOVERY_PORT);
    a.sin_addr.s_addr = INADDR_ANY;
    if (bind(s, (struct sockaddr *)&a, sizeof(a)) != 0) {
        ESP_LOGE(TAG, "bind UDP %d", DISCOVERY_PORT);
        close(s);
        vTaskDelete(NULL);
        return;
    }
    struct timeval tv = {.tv_sec = 1, .tv_usec = 0};
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    char b[512];
    for (;;) {
        struct sockaddr_in from;
        socklen_t fl = sizeof(from);
        int n = recvfrom(s, b, sizeof(b) - 1, 0, (struct sockaddr *)&from, &fl);
        if (n > 0) {
            b[n] = 0;
            char ip[16];
            inet_ntoa_r(from.sin_addr, ip, sizeof(ip));
            parse_packet(b, ip, n);
        }
        /* Détection hors-ligne */
        int64_t t = now_ms();
        int went_offline[WORKER_MAX];
        int k = 0;
        LOCK();
        for (int i = 0; i < WORKER_MAX; i++) {
            if (w[i].seen && strcmp(w[i].state, "OFFLINE") != 0 && t - w[i].last_seen_ms > (int64_t)WORKER_HEARTBEAT_TIMEOUT_MS) {
                strlcpy(w[i].state, "OFFLINE", sizeof(w[i].state));
                went_offline[k++] = w[i].id;
            }
        }
        UNLOCK();
        for (int i = 0; i < k; i++) evlog_add('W', "fleet", "W%d hors ligne (plus de heartbeat)", went_offline[i]);
    }
}

/* Journal en direct par worker : lignes « LOG|W<id>|<ms>|texte » reçues sur UDP 4212. */
#define WLOG_LINES 160
typedef struct {
    uint32_t seq;
    uint8_t id;
    int64_t ts_ms;
    char text[120];
} wlog_t;
static wlog_t s_wlog[WLOG_LINES];
static uint32_t s_wlog_seq;

static void wlog_add(const char *ip, const char *line)
{
    int id = 0;
    const char *text = line;
    if (!strncmp(line, "LOG|W", 5)) {
        id = atoi(line + 5);
        const char *p = strchr(line + 5, '|');
        p = p ? strchr(p + 1, '|') : NULL;
        if (p) text = p + 1;
    }
    LOCK();
    if (id < 1 || id > WORKER_MAX) {  /* sinon : retrouver le worker par son adresse IP */
        id = 0;
        for (int i = 0; i < WORKER_MAX; i++)
            if (w[i].seen && !strcmp(w[i].ip, ip)) { id = w[i].id; break; }
    }
    wlog_t *e = &s_wlog[s_wlog_seq % WLOG_LINES];
    e->seq = ++s_wlog_seq;
    e->id = (uint8_t)id;
    e->ts_ms = now_ms();
    size_t n = strcspn(text, "\r\n");
    if (n >= sizeof(e->text)) n = sizeof(e->text) - 1;
    memcpy(e->text, text, n);
    e->text[n] = 0;
    UNLOCK();
}

uint32_t worker_log_json(cJSON *arr, uint8_t id, uint32_t since)
{
    int64_t t = now_ms();
    LOCK();
    uint32_t last = s_wlog_seq;
    uint32_t first = last > WLOG_LINES ? last - WLOG_LINES + 1 : 1;
    if (since + 1 > first) first = since + 1;
    for (uint32_t q = first; arr && q <= last; q++) {
        wlog_t *e = &s_wlog[q % WLOG_LINES];
        if (e->seq != q || (id && e->id != id)) continue;
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddNumberToObject(o, "seq", q);
        cJSON_AddNumberToObject(o, "id", e->id);
        cJSON_AddNumberToObject(o, "age_ms", (double)(t - e->ts_ms));
        cJSON_AddStringToObject(o, "text", e->text);
        cJSON_AddItemToArray(arr, o);
    }
    UNLOCK();
    return last;
}

static void log_task(void *arg)
{
    (void)arg;
    int s = socket(AF_INET, SOCK_DGRAM, IPPROTO_IP);
    if (s < 0) { vTaskDelete(NULL); return; }
    struct sockaddr_in a = {0};
    a.sin_family = AF_INET;
    a.sin_port = htons(LOG_PORT);
    a.sin_addr.s_addr = INADDR_ANY;
    if (bind(s, (struct sockaddr *)&a, sizeof(a)) != 0) { close(s); vTaskDelete(NULL); return; }
    char b[512];
    for (;;) {
        struct sockaddr_in from;
        socklen_t fl = sizeof(from);
        int n = recvfrom(s, b, sizeof(b) - 2, 0, (struct sockaddr *)&from, &fl); /* bloquant : pas d'attente active */
        if (n > 0) {
            char ip[16];
            inet_ntoa_r(from.sin_addr, ip, sizeof(ip));
            if (b[n - 1] != '\n') b[n++] = '\n';
            b[n] = 0;
            netmon_record(NM_RX, NM_LOG, 0, ip, (uint16_t)n, "%.*s", n > 1 ? n - 1 : 0, b);
            wlog_add(ip, b);
            storage_append_text("/sd/LOGS/workers.log", b);
        }
    }
}

/* ---------- HTTP vers les workers ---------- */

static bool worker_ip(uint8_t id, char ip[16], bool require_online)
{
    bool ok = false;
    LOCK();
    worker_info_t *x = byid_locked(id);
    if (x && (!require_online || strcmp(x->state, "OFFLINE") != 0) && ip_valid(x->ip)) {
        strlcpy(ip, x->ip, 16);
        ok = true;
    }
    UNLOCK();
    return ok;
}

/* POST application/x-www-form-urlencoded ; lit la réponse si resp != NULL. */
static esp_err_t worker_post(uint8_t id, const char *path, const char *body, int timeout_ms, char *resp, size_t cap,
                             int *status)
{
    char ip[16];
    if (!worker_ip(id, ip, true)) return ESP_ERR_NOT_FOUND;
    char url[96];
    snprintf(url, sizeof(url), "http://%s%s", ip, path);
    netmon_record(NM_TX, NM_HTTP, id, ip, (uint16_t)(body ? strlen(body) : 0), "POST %s", path);
    esp_http_client_config_t c = {.url = url, .method = HTTP_METHOD_POST, .timeout_ms = timeout_ms};
    esp_http_client_handle_t h = esp_http_client_init(&c);
    if (!h) return ESP_FAIL;
    esp_http_client_set_header(h, "Content-Type", "application/x-www-form-urlencoded");
    int blen = body ? (int)strlen(body) : 0;
    esp_err_t r = esp_http_client_open(h, blen);
    if (r == ESP_OK && blen > 0 && esp_http_client_write(h, body, blen) != blen) r = ESP_FAIL;
    if (r == ESP_OK) {
        esp_http_client_fetch_headers(h);
        int code = esp_http_client_get_status_code(h);
        if (status) *status = code;
        if (resp && cap > 0) {
            int got = 0;
            while ((size_t)got + 1 < cap) {
                int k = esp_http_client_read(h, resp + got, (int)(cap - 1 - got));
                if (k <= 0) break;
                got += k;
            }
            resp[got] = 0;
        }
        if (code < 200 || code >= 300) r = ESP_FAIL;
    }
    esp_http_client_close(h);
    esp_http_client_cleanup(h);
    return r;
}

esp_err_t worker_http_post(uint8_t id, const char *path, const char *form, int timeout_ms, char *out, size_t cap, int *status)
{
    if (out && cap) out[0] = 0;
    return worker_post(id, path, form, timeout_ms, out, cap, status);
}

esp_err_t worker_http_get(uint8_t id, const char *path, char *out, size_t cap, int *status)
{
    if (!out || cap < 2) return ESP_ERR_INVALID_ARG;
    out[0] = 0;
    char ip[16];
    if (!worker_ip(id, ip, true)) return ESP_ERR_NOT_FOUND;
    char url[128];
    snprintf(url, sizeof(url), "http://%s%s", ip, path);
    esp_http_client_config_t c = {.url = url, .timeout_ms = 4000};
    esp_http_client_handle_t h = esp_http_client_init(&c);
    if (!h) return ESP_FAIL;
    esp_err_t r = esp_http_client_open(h, 0);
    if (r == ESP_OK) {
        esp_http_client_fetch_headers(h);
        if (status) *status = esp_http_client_get_status_code(h);
        int got = 0;
        while ((size_t)got + 1 < cap) {
            int k = esp_http_client_read(h, out + got, (int)(cap - 1 - got));
            if (k <= 0) break;
            got += k;
        }
        out[got] = 0;
    }
    esp_http_client_close(h);
    esp_http_client_cleanup(h);
    return r;
}

esp_err_t worker_refresh_result(uint8_t id)
{
    char *buf = malloc(3072);
    if (!buf) return ESP_ERR_NO_MEM;
    int st = 0;
    esp_err_t r = worker_http_get(id, "/api/info", buf, 3072, &st);
    if (r == ESP_OK && st == 200) {
        cJSON *j = cJSON_Parse(buf);
        cJSON *lr = j ? cJSON_GetObjectItem(j, "last_result") : NULL;
        if (cJSON_IsString(lr)) {
            LOCK();
            worker_info_t *x = byid_locked(id);
            if (x) copy_clean(x->last_result, sizeof(x->last_result), lr->valuestring);
            UNLOCK();
        }
        cJSON_Delete(j);
    }
    free(buf);
    return r;
}

esp_err_t worker_send_job(uint8_t id, const char *type, int priority, char *resp, size_t resp_cap)
{
    char body[96];
    snprintf(body, sizeof(body), "type=%s&priority=%d", type, priority);
    int status = 0;
    esp_err_t r = worker_post(id, "/api/job", body, 6000, resp, resp_cap, &status);
    if (r == ESP_OK) worker_pool_mark(id, "BUSY", type);
    else if (status == 409) r = ESP_ERR_INVALID_STATE;
    return r;
}

esp_err_t worker_cancel_job(uint8_t id)
{
    esp_err_t r = worker_post(id, "/api/cancel", "", 3000, NULL, 0, NULL);
    if (r == ESP_OK) worker_pool_mark(id, "CANCELLING", "");
    return r;
}

esp_err_t worker_reboot(uint8_t id)
{
    esp_err_t r = worker_post(id, "/api/reboot", "", 3000, NULL, 0, NULL);
    if (r == ESP_OK) {
        worker_pool_mark(id, "RECONNECTING", "");
        evlog_add('I', "fleet", "redémarrage de W%d demandé", id);
    }
    return r;
}

esp_err_t worker_set_label(uint8_t id, const char *label)
{
    if (!label) return ESP_ERR_INVALID_ARG;
    char key[16] = {0};
    char mac12[13] = {0};
    LOCK();
    worker_info_t *x = byid_locked(id);
    if (x) {
        copy_clean(x->label, sizeof(x->label), label);
        size_t k = 0;
        for (const char *p = x->mac; *p && k < 12; ++p)
            if (isxdigit((unsigned char)*p)) mac12[k++] = (char)tolower((unsigned char)*p);
    }
    UNLOCK();
    if (!x) return ESP_ERR_NOT_FOUND;
    snprintf(key, sizeof(key), "l%s", mac12);
    nvs_handle_t h;
    ESP_RETURN_ON_ERROR(nvs_open("wlabels", NVS_READWRITE, &h), TAG, "nvs");
    esp_err_t r = label[0] ? nvs_set_str(h, key, label) : nvs_erase_key(h, key);
    if (r == ESP_ERR_NVS_NOT_FOUND) r = ESP_OK;
    if (r == ESP_OK) r = nvs_commit(h);
    nvs_close(h);
    return r;
}

esp_err_t worker_forget(uint8_t id)
{
    esp_err_t r = ESP_ERR_NOT_FOUND;
    LOCK();
    worker_info_t *x = byid_locked(id);
    if (x && !strcmp(x->state, "OFFLINE")) {
        memset(x, 0, sizeof(*x));
        r = ESP_OK;
    } else if (x) {
        r = ESP_ERR_INVALID_STATE;
    }
    UNLOCK();
    return r;
}

esp_err_t worker_flash(uint8_t id, const char *sd_path, bool as_project)
{
    if (!storage_ready()) return ESP_ERR_INVALID_STATE;
    char ip[16];
    if (!worker_ip(id, ip, true)) return ESP_ERR_NOT_FOUND;
    char sha[65];
    ESP_RETURN_ON_ERROR(storage_sha256_file(sd_path, sha), TAG, "sha256");
    uint8_t rnd[8];
    esp_fill_random(rnd, sizeof(rnd));
    char token[17];
    for (int i = 0; i < 8; i++) snprintf(token + i * 2, 3, "%02x", rnd[i]);
    ota_register_local_file(token, sd_path);
    char body[220];
    snprintf(body, sizeof(body), "url=http://" AP_IP_STR "/api/fw/%s&sha256=%s%s", token, sha, as_project ? "&app=1" : "");
    led_status_mode("flash");
    esp_err_t r = worker_post(id, "/api/flash", body, 10000, NULL, 0, NULL);
    if (r == ESP_OK) {
        worker_pool_mark(id, "FLASHING", as_project ? "PROJET" : "OTA");
        evlog_add('I', "fleet", as_project ? "W%d : chargement du projet %s" : "OTA de W%d lancée (%s)", id, sd_path);
    } else {
        evlog_add('E', "fleet", "OTA de W%d refusée (%s)", id, esp_err_to_name(r));
    }
    return r;
}

static void url_encode(const char *in, char *out, size_t cap)
{
    static const char hex[] = "0123456789ABCDEF";
    size_t o = 0;
    while (in && *in && o + 4 < cap) {
        unsigned char c = (unsigned char)*in++;
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') out[o++] = (char)c;
        else {
            out[o++] = '%';
            out[o++] = hex[c >> 4];
            out[o++] = hex[c & 15];
        }
    }
    out[o] = 0;
}

esp_err_t worker_flash_remote(uint8_t id, const char *url, const char *expected_sha, bool as_project)
{
    char ip[16];
    if (!worker_ip(id, ip, true)) return ESP_ERR_NOT_FOUND;
    if (!url || !expected_sha || strlen(url) > 480 || strlen(expected_sha) != 64 ||
        strncmp(url, "http://192.168.4.", 17) != 0 || strchr(url, '\r') || strchr(url, '\n') ||
        strchr(url, '?') || strchr(url, '#')) return ESP_ERR_INVALID_ARG;
    const char *host = url + 7;
    const char *path = strchr(host, '/');
    if (!path || strncmp(path, "/download/firmware/", 19) != 0 || !strstr(path, ".bin")) return ESP_ERR_INVALID_ARG;
    size_t host_len = (size_t)(path - host);
    if (host_len == 0 || host_len >= 32) return ESP_ERR_INVALID_ARG;
    char pi_host[32];
    memcpy(pi_host, host, host_len);
    pi_host[host_len] = 0;
    unsigned last_octet = 0;
    char extra = 0;
    if (sscanf(pi_host, "192.168.4.%u:8088%c", &last_octet, &extra) != 1 || last_octet < 2 || last_octet > 254)
        return ESP_ERR_INVALID_ARG;
    for (int i = 0; i < 64; i++)
        if (!isxdigit((unsigned char)expected_sha[i])) return ESP_ERR_INVALID_ARG;
    char encoded[1450], body[1600];
    url_encode(url, encoded, sizeof(encoded));
    int n = snprintf(body, sizeof(body), "url=%s&sha256=%s%s", encoded, expected_sha, as_project ? "&app=1" : "");
    if (n < 0 || (size_t)n >= sizeof(body)) return ESP_ERR_INVALID_SIZE;
    led_status_mode("flash");
    esp_err_t r = worker_post(id, "/api/flash", body, 10000, NULL, 0, NULL);
    if (r == ESP_OK) {
        worker_pool_mark(id, "FLASHING", as_project ? "PROJET_PI" : "OTA_PI");
        evlog_add('I', "fleet", as_project ? "W%d : téléchargement projet autorisé par le MASTER" : "OTA distante W%d autorisée par le MASTER", id);
    } else evlog_add('E', "fleet", "OTA distante W%d refusée (%s)", id, esp_err_to_name(r));
    return r;
}

void worker_pool_push_ap_config(void)
{
    char ss[120], pp[200], msg[340];
    url_encode(g_lab_cfg.ap_ssid, ss, sizeof(ss));
    url_encode(g_lab_cfg.ap_pass, pp, sizeof(pp));
    snprintf(msg, sizeof(msg), "APCFG|%s|%s", ss, pp);
    char ips[WORKER_MAX][16];
    int n = 0;
    LOCK();
    for (int i = 0; i < WORKER_MAX; i++)
        if (w[i].seen && strcmp(w[i].state, "OFFLINE") != 0) strlcpy(ips[n++], w[i].ip, 16);
    UNLOCK();
    for (int i = 0; i < n; i++) send_packet(msg, ips[i], DISCOVERY_PORT);
}

void worker_pool_discover(void)
{
    send_packet("DISCOVER|ESP32-LAB|" LAB_VERSION, NULL, DISCOVERY_PORT);
}

void worker_pool_start(void)
{
    s_mx = xSemaphoreCreateMutex();
    memset(w, 0, sizeof(w));
    xTaskCreate(rx_task, "worker_rx", 4096, NULL, 8, NULL);
    xTaskCreate(log_task, "worker_log", 3584, NULL, 3, NULL);
    worker_pool_discover();
}
