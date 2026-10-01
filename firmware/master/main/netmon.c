/* Wireshark du Labo — anneau de capture + métriques perte/gigue par worker. Voir netmon.h. */
#include "netmon.h"
#include "lab_config.h"
#include "esp_heap_caps.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include <math.h>
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

#define NM_RING 128

typedef struct {
    uint32_t seq;
    int64_t ts_ms;
    uint8_t dir;
    uint8_t proto;
    uint8_t worker;
    char ip[16];
    uint16_t len;
    char summary[80];
} nm_frame_t;

typedef struct {
    uint32_t rx;             /* battements reçus */
    uint32_t loss;           /* battements manqués (cumul) */
    float jitter_ms;         /* écart moyen glissant vs 1000 ms */
    int64_t last_ms;
} nm_metric_t;

static nm_frame_t *s_ring;               /* NM_RING entrées, en PSRAM si possible */
static nm_metric_t s_metric[WORKER_MAX + 1];
static SemaphoreHandle_t s_mx;
static volatile bool s_armed;
static uint32_t s_seq;                    /* dernier seq attribué */
static uint32_t s_head;                   /* index d'écriture dans l'anneau */

static int64_t now_ms(void) { return esp_timer_get_time() / 1000; }

void netmon_init(void)
{
    s_mx = xSemaphoreCreateMutex();
    s_ring = heap_caps_malloc(sizeof(nm_frame_t) * NM_RING, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!s_ring) s_ring = calloc(NM_RING, sizeof(nm_frame_t));
    else memset(s_ring, 0, sizeof(nm_frame_t) * NM_RING);
}

bool netmon_armed(void) { return s_armed; }

void netmon_arm(bool on)
{
    if (!s_mx) return;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    s_armed = on;
    if (!on) {                            /* on vide l'anneau et les métriques à l'arrêt */
        if (s_ring) memset(s_ring, 0, sizeof(nm_frame_t) * NM_RING);
        memset(s_metric, 0, sizeof(s_metric));
        s_head = 0;
    }
    xSemaphoreGive(s_mx);
}

void netmon_record(uint8_t dir, uint8_t proto, uint8_t worker, const char *ip, uint16_t len, const char *fmt, ...)
{
    if (!s_armed || !s_ring || !s_mx) return;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    nm_frame_t *e = &s_ring[s_head];
    s_head = (s_head + 1) % NM_RING;
    memset(e, 0, sizeof(*e));
    e->seq = ++s_seq;
    e->ts_ms = now_ms();
    e->dir = dir;
    e->proto = proto;
    e->worker = worker;
    e->len = len;
    if (ip) strlcpy(e->ip, ip, sizeof(e->ip));
    if (fmt) {
        va_list ap;
        va_start(ap, fmt);
        vsnprintf(e->summary, sizeof(e->summary), fmt, ap);
        va_end(ap);
    }
    xSemaphoreGive(s_mx);
}

void netmon_note_heartbeat(uint8_t worker, int64_t arrival_ms)
{
    if (worker < 1 || worker > WORKER_MAX || !s_mx) return;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    nm_metric_t *m = &s_metric[worker];
    if (m->last_ms > 0) {
        int64_t gap = arrival_ms - m->last_ms;
        if (gap < 0) gap = 0;
        int64_t missed = (gap - 500) / 1000;      /* battements attendus toutes les 1000 ms */
        if (missed > 0) m->loss += (uint32_t)missed;
        float dev = fabsf((float)gap - 1000.0f);
        m->jitter_ms = m->jitter_ms == 0.0f ? dev : m->jitter_ms * 0.8f + dev * 0.2f;  /* lissage */
    }
    m->last_ms = arrival_ms;
    m->rx++;
    xSemaphoreGive(s_mx);
}

static const char *proto_name(uint8_t p)
{
    switch (p) {
    case NM_HELLO: return "HELLO";
    case NM_ASSIGN: return "ASSIGN";
    case NM_HB: return "HB";
    case NM_APP: return "APP";
    case NM_DISCOVER: return "DISCOVER";
    case NM_HOME: return "HOME";
    case NM_LAB: return "LAB";
    case NM_LOG: return "LOG";
    case NM_HTTP: return "HTTP";
    case NM_ESPNOW: return "ESPNOW";
    default: return "?";
    }
}

uint32_t netmon_frames_json(cJSON *arr, uint32_t since)
{
    if (!arr || !s_ring || !s_mx) return 0;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    int64_t t = now_ms();
    uint32_t last = s_seq;
    /* Parcours de l'anneau dans l'ordre d'écriture (du plus ancien au plus récent). */
    for (uint32_t i = 0; i < NM_RING; i++) {
        nm_frame_t *e = &s_ring[(s_head + i) % NM_RING];
        if (e->seq == 0 || e->seq <= since) continue;
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddNumberToObject(o, "seq", e->seq);
        cJSON_AddNumberToObject(o, "age_ms", (double)(t - e->ts_ms));
        cJSON_AddStringToObject(o, "dir", e->dir == NM_TX ? "tx" : "rx");
        cJSON_AddStringToObject(o, "proto", proto_name(e->proto));
        if (e->worker) cJSON_AddNumberToObject(o, "worker", e->worker);
        if (e->ip[0]) cJSON_AddStringToObject(o, "ip", e->ip);
        cJSON_AddNumberToObject(o, "len", e->len);
        cJSON_AddStringToObject(o, "summary", e->summary);
        cJSON_AddItemToArray(arr, o);
    }
    xSemaphoreGive(s_mx);
    return last;
}

void netmon_metrics_json(cJSON *arr)
{
    if (!arr || !s_mx) return;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    int64_t t = now_ms();
    for (int id = 1; id <= WORKER_MAX; id++) {
        nm_metric_t *m = &s_metric[id];
        if (m->rx == 0) continue;
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddNumberToObject(o, "worker", id);
        cJSON_AddNumberToObject(o, "jitter_ms", roundf(m->jitter_ms));
        cJSON_AddNumberToObject(o, "loss", m->loss);
        cJSON_AddNumberToObject(o, "rx", m->rx);
        cJSON_AddNumberToObject(o, "last_ms", (double)(t - m->last_ms));
        cJSON_AddItemToArray(arr, o);
    }
    xSemaphoreGive(s_mx);
}

void netmon_summary_json(cJSON *obj)
{
    if (!obj) return;
    cJSON_AddBoolToObject(obj, "armed", s_armed);
    if (!s_mx) return;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    float worst = 0;
    for (int id = 1; id <= WORKER_MAX; id++)
        if (s_metric[id].rx && s_metric[id].jitter_ms > worst) worst = s_metric[id].jitter_ms;
    cJSON_AddNumberToObject(obj, "total", s_seq);
    cJSON_AddNumberToObject(obj, "worst_jitter", roundf(worst));
    xSemaphoreGive(s_mx);
}
