#include "event_log.h"
#include "storage.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include <stdarg.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

#define EVLOG_SIZE 96

typedef struct {
    uint32_t seq;
    int64_t uptime_ms;
    time_t epoch;
    char level;
    char source[12];
    char msg[112];
} evlog_entry_t;

static evlog_entry_t s_ring[EVLOG_SIZE];
static uint32_t s_seq = 0;
static SemaphoreHandle_t s_mx = NULL;
static const char *TAG = "evlog";

void evlog_init(void)
{
    if (!s_mx) s_mx = xSemaphoreCreateMutex();
}

uint32_t evlog_last_seq(void)
{
    return s_seq;
}

void evlog_add(char level, const char *source, const char *fmt, ...)
{
    if (!s_mx || !fmt) return;
    evlog_entry_t e = {0};
    e.level = level ? level : 'I';
    strlcpy(e.source, source ? source : "lab", sizeof(e.source));
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(e.msg, sizeof(e.msg), fmt, ap);
    va_end(ap);
    e.uptime_ms = esp_timer_get_time() / 1000;
    time_t now = time(NULL);
    e.epoch = now > 1700000000 ? now : 0; /* 0 tant que l'heure NTP n'est pas connue */

    if (xSemaphoreTake(s_mx, pdMS_TO_TICKS(200)) != pdTRUE) return;
    e.seq = ++s_seq;
    s_ring[e.seq % EVLOG_SIZE] = e;
    xSemaphoreGive(s_mx);

    if (e.level == 'E') ESP_LOGE(TAG, "[%s] %s", e.source, e.msg);
    else if (e.level == 'W') ESP_LOGW(TAG, "[%s] %s", e.source, e.msg);
    else ESP_LOGI(TAG, "[%s] %s", e.source, e.msg);

    if (storage_ready()) {
        char line[200];
        snprintf(line, sizeof(line), "%lld;%lld;%c;%s;%s\n", (long long)e.epoch, (long long)e.uptime_ms,
                 e.level, e.source, e.msg);
        storage_append_text("/sd/LOGS/events.csv", line);
    }
}

void evlog_to_json(cJSON *arr, uint32_t since, int max_items)
{
    if (!arr || !s_mx || max_items <= 0) return;
    evlog_entry_t *copy = calloc(EVLOG_SIZE, sizeof(evlog_entry_t));
    if (!copy) return;
    uint32_t last;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    last = s_seq;
    memcpy(copy, s_ring, sizeof(s_ring));
    xSemaphoreGive(s_mx);

    uint32_t first = (last > EVLOG_SIZE) ? last - EVLOG_SIZE + 1 : 1;
    if (since + 1 > first) first = since + 1;
    if (last >= first && (int)(last - first + 1) > max_items) first = last - (uint32_t)max_items + 1;
    for (uint32_t s = first; s <= last && s != 0; ++s) {
        const evlog_entry_t *e = &copy[s % EVLOG_SIZE];
        if (e->seq != s) continue;
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        char lv[2] = {e->level, 0};
        cJSON_AddNumberToObject(o, "seq", e->seq);
        cJSON_AddNumberToObject(o, "t", (double)e->uptime_ms);
        cJSON_AddNumberToObject(o, "epoch", (double)e->epoch);
        cJSON_AddStringToObject(o, "lv", lv);
        cJSON_AddStringToObject(o, "src", e->source);
        cJSON_AddStringToObject(o, "msg", e->msg);
        cJSON_AddItemToArray(arr, o);
    }
    free(copy);
}
