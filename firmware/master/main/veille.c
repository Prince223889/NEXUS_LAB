/* Veille du labo — voir veille.h. Tout est local au MASTER ; rien n'est enregistré hors du journal d'alertes. */
#include "veille.h"
#include "event_log.h"
#include "lab_config.h"
#include "notifications.h"
#include "telemetry.h"
#include "worker_pool.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "nvs.h"
#include <ctype.h>
#include <math.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

static const char *TAG = "veille";

#define STA_MAX 16
#define KNOWN_MAX 24
#define ALERT_MAX 48
#define UNKNOWN_GRACE_MS 8000   /* un worker qui démarre s'annonce (HELLO) quelques secondes après son association */
#define RULE_COOLDOWN_MS 30000

typedef struct {
    char mac[18];
    char name[24];
} known_t;

typedef struct {
    char source[24];
    char key[24];
    char op;
    float value;
    char label[32];
} rule_t;

typedef struct {
    bool used, connected, checked, alerted;
    char mac[18];
    int64_t first_ms, last_ms;
} station_t;

typedef struct {
    uint32_t seq;
    int64_t at_ms;
    char kind[10];
    char text[120];
} alert_t;

static SemaphoreHandle_t s_mx;
static bool s_armed;
static int64_t s_armed_ms;
static known_t s_known[KNOWN_MAX];
static int s_known_n;
static rule_t s_rules[VEILLE_RULES_MAX];
static int s_rules_n;
static bool s_rule_on[VEILLE_RULES_MAX];
static int64_t s_rule_last[VEILLE_RULES_MAX];
static station_t s_sta[STA_MAX];
static alert_t s_alerts[ALERT_MAX];
static uint32_t s_seq, s_count;
static int8_t s_wstate[WORKER_MAX + 1]; /* -1 inconnu, 0 hors ligne, 1 en ligne */

static int64_t now_ms(void) { return esp_timer_get_time() / 1000; }
static void lock(void) { xSemaphoreTake(s_mx, portMAX_DELAY); }
static void unlock(void) { xSemaphoreGive(s_mx); }

static void save(void)
{
    nvs_handle_t h;
    if (nvs_open("veille", NVS_READWRITE, &h) != ESP_OK) return;
    nvs_set_u8(h, "armed", s_armed ? 1 : 0);
    nvs_set_blob(h, "known", s_known, sizeof(known_t) * (size_t)s_known_n);
    nvs_set_blob(h, "rules", s_rules, sizeof(rule_t) * (size_t)s_rules_n);
    nvs_commit(h);
    nvs_close(h);
}

static void load(void)
{
    nvs_handle_t h;
    if (nvs_open("veille", NVS_READONLY, &h) != ESP_OK) return;
    uint8_t a = 0;
    if (nvs_get_u8(h, "armed", &a) == ESP_OK) s_armed = a != 0;
    size_t len = sizeof(s_known);
    if (nvs_get_blob(h, "known", s_known, &len) == ESP_OK && len % sizeof(known_t) == 0) s_known_n = (int)(len / sizeof(known_t));
    len = sizeof(s_rules);
    if (nvs_get_blob(h, "rules", s_rules, &len) == ESP_OK && len % sizeof(rule_t) == 0) s_rules_n = (int)(len / sizeof(rule_t));
    nvs_close(h);
    for (int i = 0; i < s_known_n; i++) { s_known[i].mac[17] = 0; s_known[i].name[23] = 0; }
    for (int i = 0; i < s_rules_n; i++) { s_rules[i].source[23] = s_rules[i].key[23] = s_rules[i].label[31] = 0; }
}

/* Ajoute une alerte au journal (verrou NON tenu) ; notifie si demandé. */
static void alert(const char *kind, bool notify, const char *fmt, ...) __attribute__((format(printf, 3, 4)));
static void alert(const char *kind, bool notify, const char *fmt, ...)
{
    char text[120];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(text, sizeof(text), fmt, ap);
    va_end(ap);
    lock();
    alert_t *a = &s_alerts[s_seq % ALERT_MAX];
    a->seq = ++s_seq;
    a->at_ms = now_ms();
    strlcpy(a->kind, kind, sizeof(a->kind));
    strlcpy(a->text, text, sizeof(a->text));
    if (strcmp(kind, "veille") != 0) s_count++;
    unlock();
    evlog_add(strcmp(kind, "veille") ? 'W' : 'I', "veille", "%s", text);
    if (notify && notifications_configured()) {
        char msg[160];
        snprintf(msg, sizeof(msg), "Veille du labo : %s", text);
        notifications_send(msg);
    }
}

static bool mac_valid(const char *m)
{
    if (!m || strlen(m) != 17) return false;
    for (int i = 0; i < 17; i++) {
        if (i % 3 == 2) { if (m[i] != ':') return false; }
        else if (!isxdigit((unsigned char)m[i])) return false;
    }
    return true;
}

static const char *known_name(const char *mac) /* verrou tenu */
{
    for (int i = 0; i < s_known_n; i++)
        if (!strcasecmp(s_known[i].mac, mac)) return s_known[i].name;
    return NULL;
}

/* Numéro du worker qui porte cette adresse MAC (0 si aucun) dans un instantané de la flotte. */
static int worker_of(const char *mac, const worker_info_t *w, size_t n)
{
    for (size_t i = 0; i < n; i++)
        if (w && w[i].seen && !strcasecmp(w[i].mac, mac)) return w[i].id;
    return 0;
}

static worker_info_t *fleet(size_t *n)
{
    worker_info_t *w = calloc(WORKER_MAX, sizeof(worker_info_t));
    *n = w ? worker_pool_snapshot(w, WORKER_MAX) : 0;
    return w;
}

void veille_station(const uint8_t mac[6], bool connected)
{
    if (!s_mx) return;
    char m[18];
    snprintf(m, sizeof(m), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    lock();
    station_t *s = NULL, *free_slot = NULL, *oldest = NULL;
    for (int i = 0; i < STA_MAX; i++) {
        if (s_sta[i].used && !strcmp(s_sta[i].mac, m)) { s = &s_sta[i]; break; }
        if (!s_sta[i].used && !free_slot) free_slot = &s_sta[i];
        if (s_sta[i].used && !s_sta[i].connected && (!oldest || s_sta[i].last_ms < oldest->last_ms)) oldest = &s_sta[i];
    }
    if (!s) s = free_slot ? free_slot : oldest;
    if (s) {
        bool fresh = !s->used || strcmp(s->mac, m) != 0;
        if (fresh) { memset(s, 0, sizeof(*s)); s->used = true; strlcpy(s->mac, m, sizeof(s->mac)); s->first_ms = now_ms(); }
        if (connected && !s->connected) { s->checked = false; s->alerted = false; }
        s->connected = connected;
        s->last_ms = now_ms();
    }
    unlock();
}

esp_err_t veille_arm(bool on)
{
    lock();
    bool was = s_armed;
    s_armed = on;
    if (on && !was) {
        s_armed_ms = now_ms();
        s_count = 0;
        for (int i = 0; i <= WORKER_MAX; i++) s_wstate[i] = -1;
        for (int i = 0; i < VEILLE_RULES_MAX; i++) { s_rule_on[i] = false; s_rule_last[i] = 0; }
        for (int i = 0; i < STA_MAX; i++) s_sta[i].checked = s_sta[i].alerted = false;
    }
    save();
    unlock();
    if (on != was) alert("veille", false, "%s", on ? "veille activée" : "veille désactivée");
    return ESP_OK;
}

bool veille_armed(void) { return s_armed; }

esp_err_t veille_set_known(const char *mac, const char *name, bool known)
{
    if (!mac_valid(mac)) return ESP_ERR_INVALID_ARG;
    char m[18];
    for (int i = 0; i < 18; i++) m[i] = (char)toupper((unsigned char)mac[i]);
    lock();
    int idx = -1;
    for (int i = 0; i < s_known_n; i++) if (!strcmp(s_known[i].mac, m)) idx = i;
    esp_err_t r = ESP_OK;
    if (known) {
        if (idx < 0) {
            if (s_known_n >= KNOWN_MAX) r = ESP_ERR_NO_MEM;
            else idx = s_known_n++;
        }
        if (r == ESP_OK) {
            strlcpy(s_known[idx].mac, m, sizeof(s_known[idx].mac));
            strlcpy(s_known[idx].name, name && *name ? name : "appareil", sizeof(s_known[idx].name));
        }
    } else if (idx >= 0) {
        memmove(&s_known[idx], &s_known[idx + 1], sizeof(known_t) * (size_t)(s_known_n - idx - 1));
        s_known_n--;
    }
    if (r == ESP_OK) save();
    unlock();
    return r;
}

esp_err_t veille_set_rule(int idx, const char *source, const char *key, char op, float value, const char *label)
{
    if (!source || !*source || !key || !*key || (op != '>' && op != '<' && op != '=') || isnan(value)) return ESP_ERR_INVALID_ARG;
    lock();
    esp_err_t r = ESP_OK;
    if (idx < 0) {
        if (s_rules_n >= VEILLE_RULES_MAX) r = ESP_ERR_NO_MEM;
        else idx = s_rules_n++;
    } else if (idx >= s_rules_n) r = ESP_ERR_NOT_FOUND;
    if (r == ESP_OK) {
        rule_t *u = &s_rules[idx];
        strlcpy(u->source, source, sizeof(u->source));
        strlcpy(u->key, key, sizeof(u->key));
        u->op = op;
        u->value = value;
        strlcpy(u->label, label && *label ? label : key, sizeof(u->label));
        s_rule_on[idx] = false;
        s_rule_last[idx] = 0;
        save();
    }
    unlock();
    return r;
}

esp_err_t veille_del_rule(int idx)
{
    lock();
    esp_err_t r = ESP_ERR_NOT_FOUND;
    if (idx >= 0 && idx < s_rules_n) {
        int n = s_rules_n - idx - 1;
        memmove(&s_rules[idx], &s_rules[idx + 1], sizeof(rule_t) * (size_t)n);
        memmove(&s_rule_on[idx], &s_rule_on[idx + 1], sizeof(bool) * (size_t)n);
        memmove(&s_rule_last[idx], &s_rule_last[idx + 1], sizeof(int64_t) * (size_t)n);
        s_rules_n--;
        save();
        r = ESP_OK;
    }
    unlock();
    return r;
}

/* ------------------------------------------------------------------ surveillance */

static void check_stations(void)
{
    char macs[STA_MAX][18];
    int n = 0;
    int64_t t = now_ms();
    lock();
    for (int i = 0; i < STA_MAX; i++) {
        station_t *s = &s_sta[i];
        if (s->used && s->connected && !s->checked && t - s->last_ms >= UNKNOWN_GRACE_MS) {
            s->checked = true;
            if (!known_name(s->mac)) strlcpy(macs[n++], s->mac, sizeof(macs[0]));
        }
    }
    unlock();
    if (!n) return;
    size_t wn = 0;
    worker_info_t *w = fleet(&wn);
    for (int i = 0; i < n; i++) {
        if (worker_of(macs[i], w, wn)) continue;   /* un worker du labo n'est jamais « inconnu » */
        lock();
        for (int k = 0; k < STA_MAX; k++) if (s_sta[k].used && !strcmp(s_sta[k].mac, macs[i])) s_sta[k].alerted = true;
        unlock();
        alert("wifi", true, "appareil inconnu connecté au Wi-Fi du labo (%s)", macs[i]);
    }
    free(w);
}

static void check_workers(void)
{
    size_t n = 0;
    worker_info_t *w = fleet(&n);
    if (!w) return;
    for (size_t i = 0; i < n; i++) {
        if (!w[i].seen || w[i].id < 1 || w[i].id > WORKER_MAX) continue;
        int8_t on = strcmp(w[i].state, "OFFLINE") != 0 ? 1 : 0;
        int8_t before = s_wstate[w[i].id];
        s_wstate[w[i].id] = on;
        if (before < 0 || before == on) continue;
        if (on) alert("worker", true, "W%u%s%s est revenu en ligne", w[i].id, w[i].label[0] ? " " : "", w[i].label);
        else alert("worker", true, "W%u%s%s ne répond plus (éteint ou hors de portée)", w[i].id, w[i].label[0] ? " " : "", w[i].label);
    }
    free(w);
}

static void check_rules(void)
{
    int64_t t = now_ms();
    for (int i = 0; i < VEILLE_RULES_MAX; i++) {
        rule_t u;
        lock();
        bool exists = i < s_rules_n;
        if (exists) u = s_rules[i];
        unlock();
        if (!exists) break;
        float v = NAN;
        int64_t upd = 0;
        if (!telemetry_feed_get(u.source, u.key, &v, &upd) || t - upd > 60000) continue;  /* mesure absente ou trop ancienne */
        bool hit = u.op == '>' ? v > u.value : u.op == '<' ? v < u.value : fabsf(v - u.value) < 0.001f;
        lock();
        bool was = s_rule_on[i];
        bool fire = hit && !was && t - s_rule_last[i] >= RULE_COOLDOWN_MS;
        s_rule_on[i] = hit;
        if (fire) s_rule_last[i] = t;
        unlock();
        if (fire) alert("capteur", true, "%s : %s/%s = %.2f (%c %.2f)", u.label, u.source, u.key, v, u.op, u.value);
    }
}

static void veille_task(void *arg)
{
    (void)arg;
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(3000));
        if (!s_armed) continue;
        check_stations();
        check_workers();
        check_rules();
    }
}

void veille_start(void)
{
    s_mx = xSemaphoreCreateMutex();
    for (int i = 0; i <= WORKER_MAX; i++) s_wstate[i] = -1;
    load();
    if (s_armed) s_armed_ms = now_ms();
    if (xTaskCreate(veille_task, "veille", 4096, NULL, 4, NULL) != pdPASS) ESP_LOGE(TAG, "tâche impossible à créer");
    if (s_armed) evlog_add('I', "veille", "veille du labo active (reprise après redémarrage)");
}

/* ------------------------------------------------------------------ JSON */

void veille_status_json(cJSON *obj, uint32_t since)
{
    if (!obj || !s_mx) return;
    int64_t t = now_ms();
    lock();
    cJSON_AddBoolToObject(obj, "armed", s_armed);
    cJSON_AddNumberToObject(obj, "armed_age_s", s_armed ? (double)((t - s_armed_ms) / 1000) : 0);
    cJSON_AddNumberToObject(obj, "last", s_seq);
    cJSON_AddNumberToObject(obj, "count", s_count);
    cJSON *al = cJSON_AddArrayToObject(obj, "alerts");
    uint32_t first = s_seq > ALERT_MAX ? s_seq - ALERT_MAX + 1 : 1;
    if (since + 1 > first) first = since + 1;
    for (uint32_t q = s_seq; q >= first && q > 0; q--) {   /* plus récentes d'abord */
        alert_t *a = &s_alerts[q % ALERT_MAX];
        if (a->seq != q) continue;
        cJSON *o = cJSON_CreateObject();
        cJSON_AddNumberToObject(o, "seq", q);
        cJSON_AddNumberToObject(o, "age_s", (double)((t - a->at_ms) / 1000));
        cJSON_AddStringToObject(o, "kind", a->kind);
        cJSON_AddStringToObject(o, "text", a->text);
        cJSON_AddItemToArray(al, o);
    }
    cJSON *ks = cJSON_AddArrayToObject(obj, "known");
    for (int i = 0; i < s_known_n; i++) {
        cJSON *o = cJSON_CreateObject();
        cJSON_AddStringToObject(o, "mac", s_known[i].mac);
        cJSON_AddStringToObject(o, "name", s_known[i].name);
        cJSON_AddItemToArray(ks, o);
    }
    cJSON *rs = cJSON_AddArrayToObject(obj, "rules");
    for (int i = 0; i < s_rules_n; i++) {
        char op[2] = {s_rules[i].op, 0};
        cJSON *o = cJSON_CreateObject();
        cJSON_AddNumberToObject(o, "idx", i);
        cJSON_AddStringToObject(o, "source", s_rules[i].source);
        cJSON_AddStringToObject(o, "key", s_rules[i].key);
        cJSON_AddStringToObject(o, "op", op);
        cJSON_AddNumberToObject(o, "value", s_rules[i].value);
        cJSON_AddStringToObject(o, "label", s_rules[i].label);
        cJSON_AddBoolToObject(o, "active", s_rule_on[i]);
        cJSON_AddItemToArray(rs, o);
    }
    station_t sta[STA_MAX];
    memcpy(sta, s_sta, sizeof(sta));
    known_t kn[KNOWN_MAX];
    int kn_n = s_known_n;
    memcpy(kn, s_known, sizeof(kn));
    unlock();
    size_t wn = 0;
    worker_info_t *w = fleet(&wn);
    cJSON *ss = cJSON_AddArrayToObject(obj, "stations");
    for (int i = 0; i < STA_MAX; i++) {
        if (!sta[i].used) continue;
        const char *name = NULL;
        for (int k = 0; k < kn_n; k++) if (!strcasecmp(kn[k].mac, sta[i].mac)) name = kn[k].name;
        int wid = worker_of(sta[i].mac, w, wn);
        cJSON *o = cJSON_CreateObject();
        cJSON_AddStringToObject(o, "mac", sta[i].mac);
        cJSON_AddBoolToObject(o, "connected", sta[i].connected);
        cJSON_AddNumberToObject(o, "since_s", (double)((t - sta[i].last_ms) / 1000));
        cJSON_AddNumberToObject(o, "worker", wid);
        cJSON_AddStringToObject(o, "name", name ? name : "");
        cJSON_AddBoolToObject(o, "known", name != NULL || wid > 0);
        cJSON_AddItemToArray(ss, o);
    }
    free(w);
}

void veille_summary_json(cJSON *obj)
{
    if (!obj || !s_mx) return;
    lock();
    cJSON_AddBoolToObject(obj, "armed", s_armed);
    cJSON_AddNumberToObject(obj, "last", s_seq);
    cJSON_AddNumberToObject(obj, "count", s_count);
    unlock();
}
