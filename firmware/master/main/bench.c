/* Banc fantôme : orchestrateur côté MASTER.
 * 1. vérifie les deux workers et les broches du connecteur de banc de l'émulateur ;
 * 2. configure l'émulateur et applique les valeurs de repos (capteurs présents dès le démarrage du DUT) ;
 * 3. charge le projet sur le DUT (mode PROJECT, retour possible) et attend qu'il s'annonce ;
 * 4. déroule les étapes : consignes → attente → mesures de l'émulateur + flux UDP 4213 du DUT ;
 * 5. nettoie toujours (émulateur arrêté, DUT renvoyé au mode worker) et écrit /sd/REPORTS/BENCH/…json. */
#include "bench.h"
#include "lab_config.h"
#include "event_log.h"
#include "notifications.h"
#include "storage.h"
#include "telemetry.h"
#include "worker_pool.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>

#define BENCH_MAX_CH 8
#define BENCH_MAX_STEPS 64
#define BENCH_BOOT_TIMEOUT_MS 120000
#define BENCH_RESP_CAP 1024

static const char *TAG = "bench";

typedef struct {
    cJSON *plan;
    char bin[200];
    uint8_t dut, emu;
} bench_args_t;

static SemaphoreHandle_t s_mx;
static volatile bool s_running = false;
static volatile bool s_stop = false;
static cJSON *s_status = NULL; /* protégé par s_mx */

static int64_t now_ms(void) { return esp_timer_get_time() / 1000; }

/* ---------- état partagé avec l'API ---------- */

static void status_set_str(const char *key, const char *value)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    cJSON_DeleteItemFromObject(s_status, key);
    cJSON_AddStringToObject(s_status, key, value ? value : "");
    xSemaphoreGive(s_mx);
}

static void status_set_num(const char *key, double value)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    cJSON_DeleteItemFromObject(s_status, key);
    cJSON_AddNumberToObject(s_status, key, value);
    xSemaphoreGive(s_mx);
}

static void status_add_result(cJSON *res)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    cJSON *arr = cJSON_GetObjectItem(s_status, "results");
    if (arr) cJSON_AddItemToArray(arr, res);
    else cJSON_Delete(res);
    xSemaphoreGive(s_mx);
}

void bench_status_json(cJSON *obj, bool detailed)
{
    if (!obj || !s_mx) return;
    xSemaphoreTake(s_mx, portMAX_DELAY);
    for (cJSON *it = s_status ? s_status->child : NULL; it; it = it->next) {
        if (!detailed && !strcmp(it->string, "results")) continue;
        cJSON *copy = cJSON_Duplicate(it, true);
        if (copy) cJSON_AddItemToObject(obj, it->string, copy);
    }
    xSemaphoreGive(s_mx);
    cJSON_AddBoolToObject(obj, "running", s_running);
}

bool bench_running(void) { return s_running; }
void bench_stop(void)
{
    if (s_running) s_stop = true;
}

/* ---------- échanges avec les workers ---------- */

static const char *jstr(const cJSON *o, const char *k)
{
    const cJSON *v = cJSON_GetObjectItem(o, k);
    return cJSON_IsString(v) ? v->valuestring : "";
}

static bool jnum(const cJSON *o, const char *k, double *out)
{
    const cJSON *v = cJSON_GetObjectItem(o, k);
    if (!cJSON_IsNumber(v)) return false;
    if (out) *out = v->valuedouble;
    return true;
}

/* Vrai si `pin` figure dans la liste JSON `key` de l'objet capabilities.emu. */
static bool caps_has_pin(const cJSON *emu, const char *key, int pin)
{
    const cJSON *arr = cJSON_GetObjectItem(emu, key);
    const cJSON *it;
    cJSON_ArrayForEach(it, arr) if (cJSON_IsNumber(it) && it->valueint == pin) return true;
    return false;
}

static bool check_emulator(uint8_t emu, const cJSON *channels, char *err, size_t cap)
{
    char *buf = malloc(BENCH_RESP_CAP);
    if (!buf) { snprintf(err, cap, "mémoire insuffisante"); return false; }
    int st = 0;
    esp_err_t e = worker_http_get(emu, "/api/capabilities", buf, BENCH_RESP_CAP, &st);
    cJSON *caps = (e == ESP_OK && st == 200) ? cJSON_Parse(buf) : NULL;
    free(buf);
    const cJSON *ec = caps ? cJSON_GetObjectItem(caps, "emu") : NULL;
    bool ok = true;
    if (!ec) {
        snprintf(err, cap, "W%u ne propose pas l'émulateur : mettez à jour son firmware worker", emu);
        ok = false;
    }
    const cJSON *ch;
    cJSON_ArrayForEach(ch, channels) {
        if (!ok) break;
        double pin = -1;
        jnum(ch, "emu", &pin);
        const char *kind = jstr(ch, "kind");
        const char *list = !strcmp(kind, "analog") ? "dac" : !strcmp(kind, "digital") ? "dout" : !strcmp(kind, "i2c") ? NULL : "din";
        if (list && !caps_has_pin(ec, list, (int)pin)) {
            if (!strcmp(kind, "analog")) snprintf(err, cap, "W%u n'a pas de sortie DAC sur GPIO%d (ESP32 classique requis)", emu, (int)pin);
            else snprintf(err, cap, "GPIO%d n'est pas sur le connecteur de banc de W%u", (int)pin, emu);
            ok = false;
        }
    }
    cJSON_Delete(caps);
    return ok;
}

/* « n:kind:pin[:addr:pointer];… » attendu par POST /api/emu/setup du worker. */
static bool build_setup(const cJSON *channels, char *out, size_t cap)
{
    size_t o = 0;
    const cJSON *ch;
    out[0] = 0;
    cJSON_ArrayForEach(ch, channels) {
        double n = -1, pin = -1, addr = 0;
        jnum(ch, "n", &n);
        jnum(ch, "emu", &pin);
        const char *kind = jstr(ch, "kind");
        if (n < 0 || n >= BENCH_MAX_CH || !kind[0]) return false;
        int k;
        if (!strcmp(kind, "i2c")) {
            jnum(ch, "addr", &addr);
            k = snprintf(out + o, cap - o, "%s%d:i2c:%d:%d:%d", o ? ";" : "", (int)n, (int)pin, (int)addr,
                         cJSON_IsFalse(cJSON_GetObjectItem(ch, "pointer")) ? 0 : 1);
        } else {
            for (const char *p = kind; *p; ++p)
                if (!islower((unsigned char)*p)) return false;
            k = snprintf(out + o, cap - o, "%s%d:%s:%d", o ? ";" : "", (int)n, kind, (int)pin);
        }
        if (k < 0 || (size_t)k >= cap - o) return false;
        o += (size_t)k;
    }
    return o > 0;
}

/* « n:valeur;… » attendu par POST /api/emu/set (valeur : mV, 0/1, hexa, @0/@1). */
static bool build_set(const cJSON *set, char *out, size_t cap)
{
    size_t o = 0;
    const cJSON *s;
    out[0] = 0;
    cJSON_ArrayForEach(s, set) {
        double n = -1, v = 0;
        jnum(s, "n", &n);
        if (n < 0 || n >= BENCH_MAX_CH) return false;
        const cJSON *raw = cJSON_GetObjectItem(s, "raw");
        int k;
        if (jnum(s, "online", &v)) k = snprintf(out + o, cap - o, "%s%d:@%d", o ? ";" : "", (int)n, v != 0);
        else if (cJSON_IsString(raw) && strlen(raw->valuestring) == 4 && strspn(raw->valuestring, "0123456789abcdefABCDEF") == 4)
            k = snprintf(out + o, cap - o, "%s%d:%s", o ? ";" : "", (int)n, raw->valuestring);
        else if (cJSON_IsNumber(raw)) k = snprintf(out + o, cap - o, "%s%d:%ld", o ? ";" : "", (int)n, lround(raw->valuedouble));
        else return false;
        if (k < 0 || (size_t)k >= cap - o) return false;
        o += (size_t)k;
    }
    return true;
}

static esp_err_t emu_post(uint8_t emu, const char *path, const char *key, const char *value, char *err, size_t cap)
{
    size_t n = strlen(key) + strlen(value) + 2;
    char *body = malloc(n);
    if (!body) return ESP_ERR_NO_MEM;
    snprintf(body, n, "%s=%s", key, value);
    char resp[128];
    int st = 0;
    esp_err_t e = worker_http_post(emu, path, body, 5000, resp, sizeof(resp), &st);
    free(body);
    if (e != ESP_OK && err) snprintf(err, cap, "émulateur W%u : %s (HTTP %d)", emu, resp[0] ? resp : esp_err_to_name(e), st);
    return e;
}

static const char *worker_state(uint8_t id, char *buf, size_t cap)
{
    worker_info_t w;
    if (!worker_pool_get_copy(id, &w)) strlcpy(buf, "ABSENT", cap);
    else strlcpy(buf, w.state, cap);
    return buf;
}

/* Attente interruptible ; faux si arrêt demandé ou DUT perdu. */
static bool wait_ms(uint32_t ms, uint8_t dut, bool dut_in_project, char *err, size_t cap)
{
    int64_t end = now_ms() + ms;
    char st[16];
    while (now_ms() < end) {
        if (s_stop) { snprintf(err, cap, "arrêt demandé"); return false; }
        if (dut_in_project && strcmp(worker_state(dut, st, sizeof(st)), "PROJECT") != 0) {
            snprintf(err, cap, "le DUT W%u a quitté le mode projet (%s)", dut, st);
            return false;
        }
        vTaskDelay(pdMS_TO_TICKS(250));
    }
    return true;
}

/* ---------- vérification d'une étape ---------- */

static cJSON *check_step(const cJSON *step, const cJSON *obs, const char *device, int64_t t0, uint32_t wait, int *failed)
{
    cJSON *checks = cJSON_CreateArray();
    const cJSON *e;
    cJSON_ArrayForEach(e, cJSON_GetObjectItem(step, "expect")) {
        cJSON *c = cJSON_CreateObject();
        bool ok = false;
        double n = -1, want = 0, tol = 0;
        jnum(e, "n", &n);
        jnum(e, "tol", &tol);
        const char *feed = jstr(e, "feed");
        if (feed[0]) {
            float v = NAN;
            int64_t upd = 0;
            bool found = telemetry_feed_get(device, feed, &v, &upd);
            cJSON_AddStringToObject(c, "feed", feed);
            if (cJSON_IsTrue(cJSON_GetObjectItem(e, "absent"))) {
                /* la mesure doit s'être interrompue pendant la seconde moitié de l'étape */
                ok = !found || upd < t0 + (int64_t)wait / 2;
                cJSON_AddStringToObject(c, "want", "absente");
                if (found) cJSON_AddNumberToObject(c, "age_ms", (double)(now_ms() - upd));
            } else {
                jnum(e, "v", &want);
                ok = found && fabs(v - want) <= tol + 1e-6;
                cJSON_AddNumberToObject(c, "want", want);
                cJSON_AddNumberToObject(c, "tol", tol);
                if (found) {
                    cJSON_AddNumberToObject(c, "got", roundf(v * 1000) / 1000);
                    cJSON_AddNumberToObject(c, "age_ms", (double)(now_ms() - upd));
                }
            }
        } else {
            const cJSON *o = NULL, *it;
            cJSON_ArrayForEach(it, cJSON_GetObjectItem(obs, "ch")) {
                double k = -1;
                if (jnum(it, "n", &k) && k == n) { o = it; break; }
            }
            double got = 0;
            cJSON_AddNumberToObject(c, "n", n);
            if (jnum(e, "level", &want)) {
                ok = o && jnum(o, "level", &got) && got == want;
                cJSON_AddStringToObject(c, "what", "niveau");
            } else {
                jnum(e, "duty", &want);
                ok = o && jnum(o, "duty", &got) && fabs(got - want) <= tol + 1e-6;
                cJSON_AddStringToObject(c, "what", "rapport cyclique");
                cJSON_AddNumberToObject(c, "tol", tol);
            }
            cJSON_AddNumberToObject(c, "want", want);
            if (o) cJSON_AddNumberToObject(c, "got", got);
        }
        cJSON_AddBoolToObject(c, "ok", ok);
        if (!ok) (*failed)++;
        cJSON_AddItemToArray(checks, c);
    }
    return checks;
}

/* ---------- rapport ---------- */

static void write_report(const char *project, const char *verdict)
{
    if (!storage_ready()) return;
    storage_mkdir("/sd/REPORTS/BENCH");
    char name[48];
    size_t o = 0;
    for (const char *p = project; *p && o + 1 < sizeof(name); ++p) {
        unsigned char c = (unsigned char)*p;
        name[o++] = (isalnum(c) || c == '-' || c == '_') ? (char)tolower(c) : '_';
    }
    name[o] = 0;
    char path[120];
    time_t now = time(NULL);
    if (now > 1700000000) {
        struct tm tm;
        localtime_r(&now, &tm);
        char ts[20];
        strftime(ts, sizeof(ts), "%Y%m%d_%H%M%S", &tm);
        snprintf(path, sizeof(path), "/sd/REPORTS/BENCH/%s_%s.json", name[0] ? name : "projet", ts);
    } else {
        snprintf(path, sizeof(path), "/sd/REPORTS/BENCH/%s_up%lld.json", name[0] ? name : "projet", (long long)(now_ms() / 1000));
    }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    char *s = cJSON_Print(s_status);
    xSemaphoreGive(s_mx);
    if (!s) return;
    if (storage_write_text(path, s) == ESP_OK) status_set_str("report", path);
    free(s);
    (void)verdict;
}

/* ---------- session ---------- */

static void bench_task(void *arg)
{
    bench_args_t *a = (bench_args_t *)arg;
    const cJSON *plan = a->plan;
    const char *project = jstr(plan, "project");
    const char *device = jstr(plan, "device");
    const cJSON *channels = cJSON_GetObjectItem(plan, "channels");
    const cJSON *steps = cJSON_GetObjectItem(plan, "steps");
    char err[160] = "";
    char *buf = malloc(BENCH_RESP_CAP);
    bool emu_started = false, dut_loaded = false;
    int passed = 0, failed_steps = 0;
    int64_t t_start = now_ms();

    evlog_add('I', "bench", "banc fantôme « %s » : DUT W%u, émulateur W%u", project, a->dut, a->emu);

    /* 1. vérifications */
    status_set_str("phase", "vérification");
    char st[16];
    if (!buf) snprintf(err, sizeof(err), "mémoire insuffisante");
    else if (strcmp(worker_state(a->emu, st, sizeof(st)), "READY") != 0) snprintf(err, sizeof(err), "l'émulateur W%u n'est pas disponible (%s)", a->emu, st);
    else if (strcmp(worker_state(a->dut, st, sizeof(st)), "READY") != 0) snprintf(err, sizeof(err), "le DUT W%u n'est pas disponible (%s)", a->dut, st);
    else check_emulator(a->emu, channels, err, sizeof(err));

    /* 2. émulateur + valeurs de repos */
    if (!err[0]) {
        status_set_str("phase", "émulateur");
        if (!build_setup(channels, buf, BENCH_RESP_CAP)) snprintf(err, sizeof(err), "voies du plan invalides");
        else if (emu_post(a->emu, "/api/emu/setup", "channels", buf, err, sizeof(err)) == ESP_OK) {
            emu_started = true;
            const cJSON *first = cJSON_GetArrayItem(steps, 0);
            if (first && build_set(cJSON_GetObjectItem(first, "set"), buf, BENCH_RESP_CAP) && buf[0])
                emu_post(a->emu, "/api/emu/set", "set", buf, err, sizeof(err));
        }
    }

    /* 3. chargement du projet sur le DUT */
    if (!err[0]) {
        status_set_str("phase", "chargement du DUT");
        esp_err_t e = worker_flash(a->dut, a->bin, true);
        if (e != ESP_OK) snprintf(err, sizeof(err), "chargement du projet sur W%u impossible (%s)", a->dut, esp_err_to_name(e));
        else {
            dut_loaded = true;
            status_set_str("phase", "démarrage du DUT");
            int64_t end = now_ms() + BENCH_BOOT_TIMEOUT_MS;
            int64_t flashing_seen = 0;
            for (;;) {
                worker_state(a->dut, st, sizeof(st));
                if (!strcmp(st, "PROJECT")) break;
                if (!strcmp(st, "READY") && flashing_seen && now_ms() - flashing_seen > 20000) {
                    snprintf(err, sizeof(err), "le DUT est revenu au mode worker : le projet ne démarre pas (option « retour worker » absente ?)");
                    break;
                }
                if (!strcmp(st, "FLASHING") || !strcmp(st, "OFFLINE")) flashing_seen = now_ms();
                if (now_ms() > end) { snprintf(err, sizeof(err), "le DUT ne s'est pas annoncé en mode projet (délai dépassé)"); break; }
                if (s_stop) { snprintf(err, sizeof(err), "arrêt demandé"); break; }
                vTaskDelay(pdMS_TO_TICKS(500));
            }
        }
    }

    /* 4. étapes */
    int total = cJSON_GetArraySize(steps);
    for (int i = 0; i < total && !err[0]; i++) {
        const cJSON *step = cJSON_GetArrayItem(steps, i);
        double wait = 1500;
        jnum(step, "wait", &wait);
        status_set_str("phase", "scénario");
        status_set_num("step", i);
        status_set_str("label", jstr(step, "label"));
        if (!build_set(cJSON_GetObjectItem(step, "set"), buf, BENCH_RESP_CAP)) { snprintf(err, sizeof(err), "étape %d invalide", i + 1); break; }
        if (buf[0] && emu_post(a->emu, "/api/emu/set", "set", buf, err, sizeof(err)) != ESP_OK) break;
        int64_t t0 = now_ms();
        if (!wait_ms((uint32_t)wait, a->dut, true, err, sizeof(err))) break;
        int status = 0;
        cJSON *obs = NULL;
        if (worker_http_get(a->emu, "/api/emu/read", buf, BENCH_RESP_CAP, &status) == ESP_OK && status == 200) obs = cJSON_Parse(buf);
        if (!obs) { snprintf(err, sizeof(err), "lecture de l'émulateur impossible (HTTP %d)", status); break; }
        int failed = 0;
        cJSON *res = cJSON_CreateObject();
        cJSON_AddNumberToObject(res, "i", i);
        cJSON_AddStringToObject(res, "label", jstr(step, "label"));
        cJSON_AddItemToObject(res, "checks", check_step(step, obs, device, t0, (uint32_t)wait, &failed));
        cJSON_AddBoolToObject(res, "ok", failed == 0);
        cJSON_Delete(obs);
        status_add_result(res);
        if (failed) failed_steps++;
        else passed++;
        status_set_num("passed", passed);
        status_set_num("failed", failed_steps);
    }

    /* 5. nettoyage — toujours */
    status_set_str("phase", "nettoyage");
    if (emu_started) emu_post(a->emu, "/api/emu/stop", "by", "master", NULL, 0);
    if (dut_loaded) {
        worker_state(a->dut, st, sizeof(st));
        if (!strcmp(st, "PROJECT")) worker_go_home(a->dut);
    }
    const char *verdict = err[0] ? (s_stop ? "arrêté" : "erreur") : failed_steps ? "échec" : "réussi";
    status_set_str("verdict", verdict);
    status_set_str("error", err);
    status_set_num("duration_ms", (double)(now_ms() - t_start));
    status_set_str("phase", "terminé");
    write_report(project, verdict);
    char msg[384];
    snprintf(msg, sizeof(msg), "Banc fantôme « %s » : %s (%d étape(s) réussie(s), %d en échec)%s%s", project, verdict, passed, failed_steps,
             err[0] ? " — " : "", err);
    evlog_add(err[0] || failed_steps ? 'W' : 'S', "bench", "%s", msg);
    if ((err[0] && !s_stop) || failed_steps) notifications_send(msg);
    ESP_LOGI(TAG, "%s", msg);

    free(buf);
    cJSON_Delete(a->plan);
    free(a);
    s_stop = false;
    s_running = false;
    vTaskDelete(NULL);
}

esp_err_t bench_run(const cJSON *plan, const char *bin_path, uint8_t dut, uint8_t emu, char *err, size_t err_cap)
{
    if (!s_mx) return ESP_ERR_INVALID_STATE;
    if (s_running) { snprintf(err, err_cap, "un banc est déjà en cours"); return ESP_ERR_INVALID_STATE; }
    const cJSON *channels = cJSON_GetObjectItem(plan, "channels");
    const cJSON *steps = cJSON_GetObjectItem(plan, "steps");
    int nch = cJSON_GetArraySize(channels), nst = cJSON_GetArraySize(steps);
    if (!cJSON_IsArray(channels) || nch < 1 || nch > BENCH_MAX_CH) { snprintf(err, err_cap, "voies du plan invalides"); return ESP_ERR_INVALID_ARG; }
    if (!cJSON_IsArray(steps) || nst < 1 || nst > BENCH_MAX_STEPS) { snprintf(err, err_cap, "étapes du plan invalides"); return ESP_ERR_INVALID_ARG; }
    if (!jstr(plan, "device")[0]) { snprintf(err, err_cap, "nom d'appareil du DUT absent"); return ESP_ERR_INVALID_ARG; }
    if (dut == emu || dut < 1 || emu < 1 || dut > WORKER_MAX || emu > WORKER_MAX) { snprintf(err, err_cap, "choisissez deux workers différents"); return ESP_ERR_INVALID_ARG; }
    struct stat sb;
    if (stat(bin_path, &sb) != 0) { snprintf(err, err_cap, "firmware introuvable : %s", bin_path); return ESP_ERR_NOT_FOUND; }

    bench_args_t *a = calloc(1, sizeof(*a));
    if (!a) return ESP_ERR_NO_MEM;
    a->plan = cJSON_Duplicate(plan, true);
    strlcpy(a->bin, bin_path, sizeof(a->bin));
    a->dut = dut;
    a->emu = emu;
    if (!a->plan) { free(a); return ESP_ERR_NO_MEM; }

    xSemaphoreTake(s_mx, portMAX_DELAY);
    cJSON_Delete(s_status);
    s_status = cJSON_CreateObject();
    cJSON_AddStringToObject(s_status, "project", jstr(plan, "project"));
    cJSON_AddStringToObject(s_status, "bin", bin_path);
    cJSON_AddNumberToObject(s_status, "dut", dut);
    cJSON_AddNumberToObject(s_status, "emu", emu);
    cJSON_AddNumberToObject(s_status, "steps", nst);
    cJSON_AddNumberToObject(s_status, "step", -1);
    cJSON_AddNumberToObject(s_status, "passed", 0);
    cJSON_AddNumberToObject(s_status, "failed", 0);
    cJSON_AddNumberToObject(s_status, "epoch", (double)time(NULL));
    cJSON_AddStringToObject(s_status, "phase", "préparation");
    cJSON_AddArrayToObject(s_status, "results");
    xSemaphoreGive(s_mx);

    s_stop = false;
    s_running = true;
    if (xTaskCreate(bench_task, "bench", 8192, a, 3, NULL) != pdPASS) {
        s_running = false;
        cJSON_Delete(a->plan);
        free(a);
        snprintf(err, err_cap, "tâche impossible à créer");
        return ESP_ERR_NO_MEM;
    }
    return ESP_OK;
}

void bench_init(void)
{
    s_mx = xSemaphoreCreateMutex();
    s_status = cJSON_CreateObject();
}
