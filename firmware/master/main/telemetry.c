#include "telemetry.h"
#include "netmon.h"
#include "lab_config.h"
#include "dht11.h"
#include "event_log.h"
#include "job_engine.h"
#include "storage.h"
#include "wifi_lab.h"
#include "worker_pool.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "lwip/inet.h"
#include "lwip/sockets.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define HIST_LEN 120
#define HIST_PERIOD_MS 5000

typedef struct {
    uint32_t t;        /* secondes depuis le démarrage */
    uint32_t heap;
    uint32_t psram;
    int16_t temp_x10;  /* INT16_MIN = pas de mesure */
    int16_t hum_x10;
    uint8_t workers;
    uint8_t jobs;
    int8_t rssi;
} sample_t;

typedef struct {
    bool used;
    char source[24];
    char key[24];
    char unit[12];
    char ip[16];
    float value;
    int64_t updated_ms;
    uint32_t count;
} feed_t;

static const char *TAG = "telemetry";
static sample_t s_hist[HIST_LEN];
static int s_hist_head = 0, s_hist_count = 0;
static feed_t s_feeds[SENSOR_FEED_MAX];
static SemaphoreHandle_t s_mx;
static volatile float s_temp = NAN, s_hum = NAN;

float telemetry_temp(void) { return s_temp; }
float telemetry_humidity(void) { return s_hum; }

static void sensor_task(void *arg)
{
    (void)arg;
    int fails = 0;
    bool header = false;
    int64_t last_log = 0;
    vTaskDelay(pdMS_TO_TICKS(1500)); /* le DHT a besoin d'une seconde après la mise sous tension */
    for (;;) {
        if (g_lab_cfg.dht_gpio >= 0) {
            float t, h;
            if (dht_read(g_lab_cfg.dht_gpio, g_lab_cfg.dht_type, &t, &h)) {
                s_temp = t;
                s_hum = h;
                fails = 0;
                int64_t now = esp_timer_get_time() / 1000000;
                if (storage_ready() && now - last_log >= 60) {
                    if (!header) {
                        storage_append_text("/sd/LOGS/temperature.csv", "epoch;uptime_s;temperature_c;humidity_pct\n");
                        header = true;
                    }
                    char b[96];
                    time_t e = time(NULL);
                    snprintf(b, sizeof(b), "%lld;%lld;%.1f;%.1f\n", (long long)(e > 1700000000 ? e : 0), (long long)now, t, h);
                    storage_append_text("/sd/LOGS/temperature.csv", b);
                    last_log = now;
                }
            } else if (++fails == 10) {
                s_temp = NAN;
                s_hum = NAN;
                evlog_add('W', "sensor", "DHT%u ne répond pas sur GPIO%d", (unsigned)g_lab_cfg.dht_type, g_lab_cfg.dht_gpio);
            }
        }
        vTaskDelay(pdMS_TO_TICKS(g_lab_cfg.dht_type == 22 ? 2500 : 3000));
    }
}

static void history_task(void *arg)
{
    (void)arg;
    for (;;) {
        sample_t s = {0};
        s.t = (uint32_t)(esp_timer_get_time() / 1000000);
        s.heap = esp_get_free_heap_size();
        s.psram = (uint32_t)heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
        float t = s_temp, h = s_hum;
        s.temp_x10 = isnan(t) ? INT16_MIN : (int16_t)lroundf(t * 10.0f);
        s.hum_x10 = isnan(h) ? INT16_MIN : (int16_t)lroundf(h * 10.0f);
        s.workers = (uint8_t)worker_pool_online();
        int running = 0;
        job_stats(NULL, &running, NULL, NULL);
        s.jobs = (uint8_t)running;
        s.rssi = (int8_t)wifi_lab_sta_rssi();
        xSemaphoreTake(s_mx, portMAX_DELAY);
        s_hist[s_hist_head] = s;
        s_hist_head = (s_hist_head + 1) % HIST_LEN;
        if (s_hist_count < HIST_LEN) s_hist_count++;
        xSemaphoreGive(s_mx);
        vTaskDelay(pdMS_TO_TICKS(HIST_PERIOD_MS));
    }
}

void telemetry_history_json(cJSON *obj)
{
    if (!obj) return;
    sample_t *copy = malloc(sizeof(s_hist));
    if (!copy) return;
    int head, count;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    memcpy(copy, s_hist, sizeof(s_hist));
    head = s_hist_head;
    count = s_hist_count;
    xSemaphoreGive(s_mx);
    cJSON *t = cJSON_AddArrayToObject(obj, "t");
    cJSON *heap = cJSON_AddArrayToObject(obj, "heap");
    cJSON *psram = cJSON_AddArrayToObject(obj, "psram");
    cJSON *temp = cJSON_AddArrayToObject(obj, "temp");
    cJSON *hum = cJSON_AddArrayToObject(obj, "hum");
    cJSON *wk = cJSON_AddArrayToObject(obj, "workers");
    cJSON *jobs = cJSON_AddArrayToObject(obj, "jobs");
    cJSON *rssi = cJSON_AddArrayToObject(obj, "rssi");
    cJSON_AddNumberToObject(obj, "period_s", HIST_PERIOD_MS / 1000);
    int start = (head - count + HIST_LEN) % HIST_LEN;
    for (int i = 0; i < count; i++) {
        const sample_t *s = &copy[(start + i) % HIST_LEN];
        cJSON_AddItemToArray(t, cJSON_CreateNumber(s->t));
        cJSON_AddItemToArray(heap, cJSON_CreateNumber(s->heap));
        cJSON_AddItemToArray(psram, cJSON_CreateNumber(s->psram));
        cJSON_AddItemToArray(temp, s->temp_x10 == INT16_MIN ? cJSON_CreateNull() : cJSON_CreateNumber(s->temp_x10 / 10.0));
        cJSON_AddItemToArray(hum, s->hum_x10 == INT16_MIN ? cJSON_CreateNull() : cJSON_CreateNumber(s->hum_x10 / 10.0));
        cJSON_AddItemToArray(wk, cJSON_CreateNumber(s->workers));
        cJSON_AddItemToArray(jobs, cJSON_CreateNumber(s->jobs));
        cJSON_AddItemToArray(rssi, cJSON_CreateNumber(s->rssi));
    }
    free(copy);
}

/* ---------- Flux capteurs : "LAB|source|clé|valeur|unité" (UDP 4213) ---------- */

static void clean(char *dst, size_t cap, const char *src)
{
    size_t o = 0;
    for (; src && *src && o + 1 < cap; ++src) {
        unsigned char c = (unsigned char)*src;
        if (c >= 0x20 && c != 0x7F && c != '|') dst[o++] = (char)c;
    }
    dst[o] = 0;
}

static void feed_update(const char *src, const char *key, float v, const char *unit, const char *ip)
{
    int64_t now = esp_timer_get_time() / 1000;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    int slot = -1, oldest = -1;
    for (int i = 0; i < SENSOR_FEED_MAX; i++) {
        if (s_feeds[i].used && !strcmp(s_feeds[i].source, src) && !strcmp(s_feeds[i].key, key)) { slot = i; break; }
        if (!s_feeds[i].used && slot < 0) slot = i;
    }
    if (slot < 0) {
        for (int i = 0; i < SENSOR_FEED_MAX; i++)
            if (oldest < 0 || s_feeds[i].updated_ms < s_feeds[oldest].updated_ms) oldest = i;
        slot = oldest;
        memset(&s_feeds[slot], 0, sizeof(feed_t));
    }
    feed_t *f = &s_feeds[slot];
    if (!f->used) {
        f->used = true;
        clean(f->source, sizeof(f->source), src);
        clean(f->key, sizeof(f->key), key);
    }
    clean(f->unit, sizeof(f->unit), unit);
    clean(f->ip, sizeof(f->ip), ip);
    f->value = v;
    f->updated_ms = now;
    f->count++;
    xSemaphoreGive(s_mx);
}

static void feed_task(void *arg)
{
    (void)arg;
    int s = socket(AF_INET, SOCK_DGRAM, IPPROTO_IP);
    if (s < 0) { vTaskDelete(NULL); return; }
    struct sockaddr_in a = {0};
    a.sin_family = AF_INET;
    a.sin_port = htons(SENSOR_FEED_PORT);
    a.sin_addr.s_addr = INADDR_ANY;
    if (bind(s, (struct sockaddr *)&a, sizeof(a)) != 0) { close(s); vTaskDelete(NULL); return; }
    char b[256];
    for (;;) {
        struct sockaddr_in from;
        socklen_t fl = sizeof(from);
        int n = recvfrom(s, b, sizeof(b) - 1, 0, (struct sockaddr *)&from, &fl);
        if (n <= 0) continue;
        b[n] = 0;
        char ip[16];
        inet_ntoa_r(from.sin_addr, ip, sizeof(ip));
        /* Un paquet peut contenir plusieurs lignes. */
        char *save = NULL;
        for (char *line = strtok_r(b, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
            uint16_t line_len = (uint16_t)strlen(line);  /* avant que le découpage ne remplace les '|' par des 0 */
            char *f[6] = {0};
            int k = 0;
            char *p = line;
            while (p && k < 6) {
                f[k++] = p;
                p = strchr(p, '|');
                if (p) *p++ = 0;
            }
            if (k >= 4 && !strcmp(f[0], "LAB")) {
                char *end = NULL;
                float v = strtof(f[3], &end);
                if (end != f[3] && isfinite(v)) {
                    feed_update(f[1], f[2], v, k >= 5 ? f[4] : "", ip);
                    netmon_record(NM_RX, NM_LAB, 0, ip, line_len, "%s %s=%.2f%s", f[1], f[2], v, k >= 5 ? f[4] : "");
                }
            }
        }
    }
}

bool telemetry_feed_get(const char *source, const char *key, float *value, int64_t *updated_ms)
{
    if (!source || !key || !s_mx) return false;
    char src[24], k[24];
    clean(src, sizeof(src), source); /* mêmes troncature et filtrage qu'à la réception */
    clean(k, sizeof(k), key);
    bool found = false;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    for (int i = 0; i < SENSOR_FEED_MAX; i++) {
        if (s_feeds[i].used && !strcmp(s_feeds[i].source, src) && !strcmp(s_feeds[i].key, k)) {
            if (value) *value = s_feeds[i].value;
            if (updated_ms) *updated_ms = s_feeds[i].updated_ms;
            found = true;
            break;
        }
    }
    xSemaphoreGive(s_mx);
    return found;
}

void telemetry_feeds_json(cJSON *arr)
{
    if (!arr) return;
    feed_t *copy = malloc(sizeof(s_feeds));
    if (!copy) return;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    memcpy(copy, s_feeds, sizeof(s_feeds));
    xSemaphoreGive(s_mx);
    int64_t now = esp_timer_get_time() / 1000;
    for (int i = 0; i < SENSOR_FEED_MAX; i++) {
        if (!copy[i].used) continue;
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddStringToObject(o, "source", copy[i].source);
        cJSON_AddStringToObject(o, "key", copy[i].key);
        cJSON_AddNumberToObject(o, "value", copy[i].value);
        cJSON_AddStringToObject(o, "unit", copy[i].unit);
        cJSON_AddStringToObject(o, "ip", copy[i].ip);
        cJSON_AddNumberToObject(o, "age_ms", (double)(now - copy[i].updated_ms));
        cJSON_AddNumberToObject(o, "count", copy[i].count);
        cJSON_AddItemToArray(arr, o);
    }
    free(copy);
}

void telemetry_start(void)
{
    s_mx = xSemaphoreCreateMutex();
    xTaskCreate(sensor_task, "dht", 3072, NULL, 4, NULL);
    xTaskCreate(history_task, "history", 3072, NULL, 2, NULL);
    xTaskCreate(feed_task, "sensor_feed", 3584, NULL, 3, NULL);
    ESP_LOGI(TAG, "télémétrie prête (flux capteurs UDP %d)", SENSOR_FEED_PORT);
}
