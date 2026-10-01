#include "agent.h"
#include "lab_config.h"
#include "event_log.h"
#include "job_engine.h"
#include "storage.h"
#include "telemetry.h"
#include "usb_avr.h"
#include "wifi_lab.h"
#include "worker_pool.h"
#include "cJSON.h"
#include "esp_crt_bundle.h"
#include "esp_heap_caps.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_timer.h"
#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *TAG = "agent";

static void mem_add(const char *role, const char *text)
{
    if (!text || !storage_ready()) return;
    cJSON *o = cJSON_CreateObject();
    if (!o) return;
    cJSON_AddNumberToObject(o, "t", (double)(esp_timer_get_time() / 1000));
    cJSON_AddStringToObject(o, "role", role ? role : "?");
    cJSON_AddStringToObject(o, "text", text);
    char *s = cJSON_PrintUnformatted(o);
    cJSON_Delete(o);
    if (!s) return;
    size_t n = strlen(s);
    char *line = malloc(n + 2);
    if (line) {
        memcpy(line, s, n);
        line[n] = '\n';
        line[n + 1] = 0;
        storage_append_text("/sd/AI/memory.jsonl", line);
        free(line);
    }
    free(s);
}

static void lower_ascii(const char *in, char *out, size_t cap)
{
    size_t o = 0;
    for (; in && *in && o + 1 < cap; ++in) out[o++] = (char)tolower((unsigned char)*in);
    out[o] = 0;
}

static bool has(const char *s, const char *word) { return strstr(s, word) != NULL; }

/* Actions sûres déclenchées par des mots-clés (jamais de flash ni de reboot). */
static void safe_actions(const char *q, cJSON *actions)
{
    char l[240];
    lower_ascii(q, l, sizeof(l));
    struct { const char *kw; const char *job; int pr; } map[] = {
        {"check-up", "SYSTEM_TEST", 60}, {"checkup", "SYSTEM_TEST", 60}, {"teste tous", "SYSTEM_TEST", 60},
        {"benchmark", "BENCHMARK", 70},  {"scan i2c", "I2C_SCAN", 50},   {"scanner i2c", "I2C_SCAN", 50},
        {"ping", "PING", 40},            {"identifie", "IDENTIFY", 40},
        /* jobs matériel en lecture seule (aucune broche pilotée) */
        {"voltm", "ADC_READ", 50},       {"tensions", "ADC_READ", 50},   {"test gpio", "GPIO_TEST", 50},
        {"teste les broches", "GPIO_TEST", 50}, {"1-wire", "ONEWIRE_SCAN", 50}, {"onewire", "ONEWIRE_SCAN", 50},
        {"ds18b20", "ONEWIRE_SCAN", 50}, {"analyseur logique", "LOGIC_SAMPLE", 50},
    };
    for (size_t i = 0; i < sizeof(map) / sizeof(map[0]); ++i) {
        if (has(l, map[i].kw)) {
            worker_info_t *snap = calloc(WORKER_MAX, sizeof(worker_info_t));
            size_t n = snap ? worker_pool_snapshot(snap, WORKER_MAX) : 0;
            int created = 0;
            for (size_t k = 0; k < n; k++)
                if (strcmp(snap[k].state, "OFFLINE") != 0 && strcmp(snap[k].state, "PROJECT") != 0 && job_create_targeted(map[i].job, map[i].pr, snap[k].id) > 0) created++;
            free(snap);
            char a[96];
            snprintf(a, sizeof(a), "%s lancé sur %d worker(s)", map[i].job, created);
            cJSON_AddItemToArray(actions, cJSON_CreateString(a));
            evlog_add('I', "agent", "%s", a);
            return;
        }
    }
}

static void lab_context(char *out, size_t cap)
{
    int queued = 0, running = 0, done = 0, failed = 0;
    job_stats(&queued, &running, &done, &failed);
    float t = telemetry_temp(), h = telemetry_humidity();
    char th[48] = "capteur DHT sans mesure";
    if (!isnan(t)) snprintf(th, sizeof(th), "%.1f °C, %.0f %% HR", t, h);
    snprintf(out, cap,
             "ESP32 LAB %s : %u/%d workers en ligne, jobs en file %d, en cours %d, réussis %d, échoués %d ; "
             "RAM libre %u o ; microSD %s ; Internet %s ; USB %s ; ambiance %s.",
             LAB_VERSION, (unsigned)worker_pool_online(), WORKER_MAX, queued, running, done, failed,
             (unsigned)esp_get_free_heap_size(), storage_ready() ? "OK" : "absente",
             wifi_lab_sta_connected() ? "connecté" : "non connecté", usb_avr_ready() ? "carte détectée" : "libre", th);
}

static void local_answer(const char *q, cJSON *res)
{
    char l[240], ctx[400], ans[900];
    lower_ascii(q, l, sizeof(l));
    lab_context(ctx, sizeof(ctx));
    if (has(l, "aide") || has(l, "help") || has(l, "que peux")) {
        snprintf(ans, sizeof(ans),
                 "Je peux : lancer un check-up (« check-up »), un benchmark, un scan I2C, un voltmètre, un test GPIO, "
                 "un scan 1-Wire, l'analyseur logique ou faire clignoter les workers (« identifie »), résumer l'état du labo (« état »). La bibliothèque contient plus de 300 projets "
                 "et le Studio génère un programme complet à partir de vos capteurs. Pour des réponses IA en ligne, "
                 "configurez une API compatible OpenAI dans l'administration.");
    } else if (has(l, "temp") || has(l, "humid")) {
        float t = telemetry_temp(), h = telemetry_humidity();
        if (isnan(t)) snprintf(ans, sizeof(ans), "Le capteur DHT du MASTER ne donne pas de mesure : vérifiez le câblage (GPIO%d).", g_lab_cfg.dht_gpio);
        else snprintf(ans, sizeof(ans), "Il fait %.1f °C avec %.0f %% d'humidité relative au niveau du MASTER.", t, h);
    } else if (has(l, "worker") || has(l, "flotte")) {
        snprintf(ans, sizeof(ans), "%u worker(s) en ligne sur %d emplacements. %s", (unsigned)worker_pool_online(), WORKER_MAX,
                 worker_pool_online() ? "Utilisez l'onglet Flotte pour les détails." :
                                        "Aucun worker : flashez firmware/worker sur un ESP32 et alimentez-le près du MASTER.");
    } else {
        snprintf(ans, sizeof(ans), "%s", ctx);
    }
    cJSON_AddStringToObject(res, "answer", ans);
    cJSON_AddStringToObject(res, "mode", "local");
}

/* Lit toute la réponse HTTP (open/write/fetch/read) : corrige la v5.2 où perform() consommait le corps. */
static char *http_exchange(const char *url, const char *method, const char *auth, const char *body, int *status)
{
    esp_http_client_config_t cfg = {
        .url = url,
        .method = !strcmp(method, "POST") ? HTTP_METHOD_POST : HTTP_METHOD_GET,
        .timeout_ms = 30000,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .buffer_size = 2048,
    };
    esp_http_client_handle_t h = esp_http_client_init(&cfg);
    if (!h) return NULL;
    if (body) esp_http_client_set_header(h, "Content-Type", "application/json");
    if (auth && auth[0]) esp_http_client_set_header(h, "Authorization", auth);
    int blen = body ? (int)strlen(body) : 0;
    char *resp = NULL;
    if (esp_http_client_open(h, blen) == ESP_OK && (blen == 0 || esp_http_client_write(h, body, blen) == blen)) {
        esp_http_client_fetch_headers(h);
        *status = esp_http_client_get_status_code(h);
        size_t cap = 16384, used = 0;
        resp = heap_caps_malloc(cap, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
        if (!resp) resp = malloc(cap);
        while (resp && used + 1 < cap) {
            int n = esp_http_client_read(h, resp + used, (int)(cap - 1 - used));
            if (n <= 0) break;
            used += (size_t)n;
        }
        if (resp) resp[used] = 0;
    }
    esp_http_client_close(h);
    esp_http_client_cleanup(h);
    return resp;
}

static bool search_online(const char *q, char *out, size_t cap)
{
    if (!q || !*q || !g_lab_cfg.search_endpoint[0] || !wifi_lab_sta_connected()) return false;
    char enc[360], url[600];
    size_t o = 0;
    static const char hex[] = "0123456789ABCDEF";
    for (const unsigned char *p = (const unsigned char *)q; *p && o + 4 < sizeof(enc); ++p) {
        if (isalnum(*p) || *p == '-' || *p == '_' || *p == '.') enc[o++] = (char)*p;
        else { enc[o++] = '%'; enc[o++] = hex[*p >> 4]; enc[o++] = hex[*p & 15]; }
    }
    enc[o] = 0;
    snprintf(url, sizeof(url), "%s%sq=%s", g_lab_cfg.search_endpoint, strchr(g_lab_cfg.search_endpoint, '?') ? "&" : "?", enc);
    int st = 0;
    char *body = http_exchange(url, "GET", NULL, NULL, &st);
    if (!body) return false;
    bool ok = false;
    cJSON *j = st >= 200 && st < 300 ? cJSON_Parse(body) : NULL;
    free(body);
    if (j) {
        cJSON *abs = cJSON_GetObjectItem(j, "AbstractText");
        cJSON *head = cJSON_GetObjectItem(j, "Heading");
        if (cJSON_IsString(abs) && abs->valuestring[0]) {
            snprintf(out, cap, "%s — %s", cJSON_IsString(head) ? head->valuestring : "", abs->valuestring);
            ok = true;
        }
        cJSON_Delete(j);
    }
    return ok;
}

static bool online_answer(const char *q, const char *research, cJSON *res)
{
    if (!g_lab_cfg.ai_endpoint[0] || !wifi_lab_sta_connected()) return false;
    char ctx[400];
    lab_context(ctx, sizeof(ctx));
    cJSON *root = cJSON_CreateObject();
    cJSON *msgs = cJSON_AddArrayToObject(root, "messages");
    cJSON_AddStringToObject(root, "model", g_lab_cfg.ai_model[0] ? g_lab_cfg.ai_model : DEFAULT_AI_MODEL);
    cJSON *sys = cJSON_CreateObject();
    char sysmsg[900];
    snprintf(sysmsg, sizeof(sysmsg),
             "Tu es l'assistant technique du laboratoire ESP32 LAB. Réponds en français, de façon concise et concrète "
             "(câblage, code Arduino/ESP-IDF, diagnostic). Ne présente jamais une action matérielle comme exécutée "
             "sans résultat. État actuel : %s", ctx);
    cJSON_AddStringToObject(sys, "role", "system");
    cJSON_AddStringToObject(sys, "content", sysmsg);
    cJSON_AddItemToArray(msgs, sys);
    cJSON *u = cJSON_CreateObject();
    cJSON_AddStringToObject(u, "role", "user");
    if (research && research[0]) {
        size_t n = strlen(q) + strlen(research) + 64;
        char *p = malloc(n);
        if (p) {
            snprintf(p, n, "%s\n\nContexte de recherche :\n%s", q, research);
            cJSON_AddStringToObject(u, "content", p);
            free(p);
        }
    } else {
        cJSON_AddStringToObject(u, "content", q);
    }
    cJSON_AddItemToArray(msgs, u);
    char *payload = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    if (!payload) return false;
    char auth[220] = "";
    if (g_lab_cfg.ai_key[0]) snprintf(auth, sizeof(auth), "Bearer %s", g_lab_cfg.ai_key);
    int st = 0;
    char *resp = http_exchange(g_lab_cfg.ai_endpoint, "POST", auth, payload, &st);
    free(payload);
    if (!resp) return false;
    bool ok = false;
    cJSON *j = cJSON_Parse(resp);
    if (j) {
        cJSON *choices = cJSON_GetObjectItem(j, "choices");
        cJSON *ch = cJSON_IsArray(choices) ? cJSON_GetArrayItem(choices, 0) : NULL;
        cJSON *msg = ch ? cJSON_GetObjectItem(ch, "message") : NULL;
        cJSON *content = msg ? cJSON_GetObjectItem(msg, "content") : NULL;
        if (cJSON_IsString(content)) {
            cJSON_AddStringToObject(res, "answer", content->valuestring);
            cJSON_AddStringToObject(res, "mode", "online");
            mem_add("assistant", content->valuestring);
            ok = true;
        } else {
            cJSON *err = cJSON_GetObjectItem(j, "error");
            cJSON *em = err ? cJSON_GetObjectItem(err, "message") : NULL;
            if (cJSON_IsString(em)) ESP_LOGW(TAG, "API IA (%d) : %s", st, em->valuestring);
        }
        cJSON_Delete(j);
    } else {
        ESP_LOGW(TAG, "réponse IA illisible (HTTP %d)", st);
    }
    free(resp);
    return ok;
}

void agent_chat(const char *q, bool allow_online, char *out, size_t cap)
{
    cJSON *res = cJSON_CreateObject();
    cJSON *actions = cJSON_AddArrayToObject(res, "actions");
    if (!q || !*q) q = "état";
    mem_add("user", q);
    safe_actions(q, actions);
    bool done = false;
    if (allow_online) {
        char *research = calloc(1, 1800);
        bool have = research && search_online(q, research, 1800);
        done = online_answer(q, have ? research : NULL, res);
        if (!done && have) {
            cJSON_AddStringToObject(res, "answer", research);
            cJSON_AddStringToObject(res, "mode", "research");
            done = true;
        }
        free(research);
    }
    if (!done) local_answer(q, res);
    char *s = cJSON_PrintUnformatted(res);
    cJSON_Delete(res);
    if (s) {
        if (strlen(s) >= cap) snprintf(out, cap, "{\"answer\":\"réponse trop longue\",\"mode\":\"error\"}");
        else strlcpy(out, s, cap);
        free(s);
    } else {
        snprintf(out, cap, "{\"answer\":\"mémoire insuffisante\",\"mode\":\"error\"}");
    }
}

void agent_start(void)
{
    ESP_LOGI(TAG, "assistant prêt (%s)", g_lab_cfg.ai_endpoint[0] ? "IA en ligne configurée" : "mode local");
}
