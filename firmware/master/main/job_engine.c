#include "job_engine.h"
#include "lab_config.h"
#include "event_log.h"
#include "led_status.h"
#include "storage.h"
#include "worker_pool.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define JOB_WORK_TIMEOUT_MS      90000
#define JOB_RETRY_MAX            2
#define JOB_SCHEDULER_INTERVAL_MS 80

typedef enum { JS_FREE = 0, JS_QUEUED, JS_RUNNING, JS_SUCCESS, JS_FAILED, JS_TIMEOUT, JS_CANCELLED } job_state_t;

typedef struct {
    int id;
    char type[24];
    int pr;
    int worker;
    int target_worker;
    int retries;
    job_state_t st;
    int progress;
    char result[128];
    int64_t created, started, finished;
} job_t;

typedef struct {
    int slot;
    int job_id;
    uint8_t worker_id;
} job_task_arg_t;

static const char *TAG = "jobs";
static job_t q[JOB_MAX];
static int seq = 1;
static SemaphoreHandle_t mx;

static const char *state_name(job_state_t s)
{
    switch (s) {
    case JS_QUEUED: return "QUEUED";
    case JS_RUNNING: return "RUNNING";
    case JS_SUCCESS: return "SUCCESS";
    case JS_FAILED: return "FAILED";
    case JS_TIMEOUT: return "TIMEOUT";
    case JS_CANCELLED: return "CANCELLED";
    default: return "FREE";
    }
}

static bool finished(job_state_t s) { return s == JS_SUCCESS || s == JS_FAILED || s == JS_TIMEOUT || s == JS_CANCELLED; }

bool job_type_valid(const char *type)
{
    static const char *ok[] = {"PING", "SYSTEM_TEST", "CHECKUP", "BENCHMARK", "FS_TEST",
                               "I2C_SCAN", "WIFI_SCAN", "MEM_TEST", "IDENTIFY",
                               /* jobs « matériel » (broches fixées dans firmware/worker/config.h) */
                               "ADC_READ", "GPIO_TEST", "PWM_GEN", "SERVO_SWEEP", "TONE_TEST",
                               "ONEWIRE_SCAN", "LOGIC_SAMPLE"};
    if (!type) return false;
    for (size_t i = 0; i < sizeof(ok) / sizeof(ok[0]); ++i) if (!strcmp(type, ok[i])) return true;
    return false;
}

static int pick_worker(int target, worker_info_t *snap, size_t n, const bool *busy)
{
    int best = -1;
    uint32_t best_heap = 0;
    for (size_t i = 0; i < n; i++) {
        const worker_info_t *t = &snap[i];
        if (strcmp(t->state, "READY") != 0 || busy[t->id]) continue;
        if (target > 0 && t->id != target) continue;
        if (best < 0 || t->heap > best_heap) { best = t->id; best_heap = t->heap; }
    }
    return best;
}

static void log_job(const job_t *j)
{
    if (!storage_ready()) return;
    char line[256];
    snprintf(line, sizeof(line), "%d;%s;W%d;%s;%lld;%s\n", j->id, j->type, j->worker, state_name(j->st),
             (long long)((j->finished - j->started) / 1000), j->result);
    storage_append_text("/sd/REPORTS/jobs.csv", line);
}

static void finish_slot(int slot, int job_id, job_state_t st, const char *result)
{
    job_t copy = {0};
    bool done = false;
    xSemaphoreTake(mx, portMAX_DELAY);
    if (slot >= 0 && slot < JOB_MAX && q[slot].id == job_id && !finished(q[slot].st)) {
        q[slot].st = st;
        q[slot].finished = esp_timer_get_time();
        if (st == JS_SUCCESS) q[slot].progress = 100;
        if (result) strlcpy(q[slot].result, result, sizeof(q[slot].result));
        copy = q[slot];
        done = true;
    }
    xSemaphoreGive(mx);
    if (done) {
        log_job(&copy);
        evlog_add(st == JS_SUCCESS ? 'S' : 'W', "jobs", "job #%d %s sur W%d : %s", copy.id, copy.type, copy.worker,
                  state_name(st));
    }
}

static void job_worker_task(void *arg)
{
    job_task_arg_t a = *(job_task_arg_t *)arg;
    free(arg);

    char type[24] = {0};
    int priority = 0;
    xSemaphoreTake(mx, portMAX_DELAY);
    bool valid = a.slot >= 0 && a.slot < JOB_MAX && q[a.slot].id == a.job_id;
    if (valid) {
        strlcpy(type, q[a.slot].type, sizeof(type));
        priority = q[a.slot].pr;
    }
    xSemaphoreGive(mx);
    if (!valid) { vTaskDelete(NULL); return; }

    worker_info_t before = {0};
    worker_pool_get_copy(a.worker_id, &before);
    char resp[96] = {0};
    esp_err_t r = worker_send_job(a.worker_id, type, priority, resp, sizeof(resp));
    if (r != ESP_OK) {
        /* Worker occupé ou injoignable : on remet en file (dans la limite des tentatives). */
        bool requeued = false;
        xSemaphoreTake(mx, portMAX_DELAY);
        if (q[a.slot].id == a.job_id && q[a.slot].st == JS_RUNNING && q[a.slot].retries < JOB_RETRY_MAX) {
            q[a.slot].retries++;
            q[a.slot].st = JS_QUEUED;
            q[a.slot].worker = 0;
            requeued = true;
        }
        xSemaphoreGive(mx);
        if (!requeued) finish_slot(a.slot, a.job_id, JS_FAILED, esp_err_to_name(r));
        vTaskDelete(NULL);
        return;
    }
    if (!strcmp(type, "PING")) {
        finish_slot(a.slot, a.job_id, JS_SUCCESS, resp[0] ? resp : "pong");
        vTaskDelete(NULL);
        return;
    }

    const int64_t deadline = esp_timer_get_time() + (int64_t)JOB_WORK_TIMEOUT_MS * 1000LL;
    bool saw_active = false;
    job_state_t outcome = JS_TIMEOUT;
    while (esp_timer_get_time() < deadline) {
        vTaskDelay(pdMS_TO_TICKS(250));
        worker_info_t now;
        bool have = worker_pool_get_copy(a.worker_id, &now);
        xSemaphoreTake(mx, portMAX_DELAY);
        bool still_mine = q[a.slot].id == a.job_id;
        bool cancelled = still_mine && q[a.slot].st == JS_CANCELLED;
        if (still_mine && have) q[a.slot].progress = (int)now.progress;
        xSemaphoreGive(mx);
        if (!still_mine || cancelled) { outcome = JS_CANCELLED; break; }
        if (!have) { outcome = JS_FAILED; break; }
        uint32_t hb_after = now.hb_count - before.hb_count;
        if (!strcmp(now.state, "TESTING") || !strcmp(now.state, "BUSY")) {
            if (hb_after >= 1) saw_active = true;
            continue;
        }
        if (!strcmp(now.state, "OFFLINE")) { outcome = JS_TIMEOUT; break; }
        if (!strcmp(now.state, "ERROR") && hb_after >= 1) { outcome = JS_FAILED; break; }
        if (!strcmp(now.state, "READY") && (saw_active || hb_after >= 2)) {
            outcome = now.progress >= 100 ? JS_SUCCESS : JS_CANCELLED;
            break;
        }
    }

    worker_refresh_result(a.worker_id); /* récupère le texte de résultat détaillé (/api/info) */
    worker_info_t fin;
    const char *res = "";
    if (worker_pool_get_copy(a.worker_id, &fin)) res = fin.last_result;
    char result[128];
    strlcpy(result, res, sizeof(result));
    finish_slot(a.slot, a.job_id, outcome, result);
    vTaskDelete(NULL);
}

static void scheduler(void *arg)
{
    (void)arg;
    worker_info_t *snap = calloc(WORKER_MAX, sizeof(worker_info_t));
    if (!snap) { vTaskDelete(NULL); return; }
    int64_t last_led = 0;
    for (;;) {
        size_t n = worker_pool_snapshot(snap, WORKER_MAX);
        bool busy[WORKER_MAX + 1] = {0};
        int running = 0;
        xSemaphoreTake(mx, portMAX_DELAY);
        for (int i = 0; i < JOB_MAX; i++) {
            if (q[i].id && q[i].st == JS_RUNNING && q[i].worker > 0 && q[i].worker <= WORKER_MAX) {
                busy[q[i].worker] = true;
                running++;
            }
        }
        for (;;) {
            int selected = -1, best_pr = -1000;
            int64_t oldest = INT64_MAX;
            for (int i = 0; i < JOB_MAX; i++) {
                if (!q[i].id || q[i].st != JS_QUEUED) continue;
                int wid = pick_worker(q[i].target_worker, snap, n, busy);
                if (wid < 0) continue;
                if (q[i].pr > best_pr || (q[i].pr == best_pr && q[i].created < oldest)) {
                    best_pr = q[i].pr;
                    oldest = q[i].created;
                    selected = i;
                }
            }
            if (selected < 0) break;
            int wid = pick_worker(q[selected].target_worker, snap, n, busy);
            job_task_arg_t *ta = calloc(1, sizeof(*ta));
            if (!ta) break;
            q[selected].worker = wid;
            q[selected].started = esp_timer_get_time();
            q[selected].st = JS_RUNNING;
            ta->slot = selected;
            ta->job_id = q[selected].id;
            ta->worker_id = (uint8_t)wid;
            busy[wid] = true;
            running++;
            if (xTaskCreate(job_worker_task, "job_worker", 5120, ta, 6, NULL) != pdPASS) {
                free(ta);
                q[selected].st = JS_QUEUED;
                q[selected].worker = 0;
                busy[wid] = false;
                running--;
                break;
            }
        }
        xSemaphoreGive(mx);
        int64_t t = esp_timer_get_time();
        if (t - last_led > 1000000) {
            led_status_mode(running > 0 ? "work" : "ready");
            last_led = t;
        }
        vTaskDelay(pdMS_TO_TICKS(JOB_SCHEDULER_INTERVAL_MS));
    }
}

void job_engine_start(void)
{
    mx = xSemaphoreCreateMutex();
    if (!mx) return;
    memset(q, 0, sizeof(q));
    xTaskCreate(scheduler, "scheduler", 4096, NULL, 7, NULL);
    ESP_LOGI(TAG, "moteur de jobs prêt (%d emplacements)", JOB_MAX);
}

int job_create_targeted(const char *type, int priority, uint8_t worker_id)
{
    if (!mx || !job_type_valid(type) || worker_id > WORKER_MAX) return -1;
    if (priority < -100) priority = -100;
    if (priority > 100) priority = 100;
    int id = -1;
    xSemaphoreTake(mx, portMAX_DELAY);
    /* Priorité : emplacement libre, sinon le job terminé le plus ancien. */
    int slot = -1;
    int64_t oldest = INT64_MAX;
    for (int i = 0; i < JOB_MAX; i++) {
        if (q[i].id == 0) { slot = i; break; }
        if (finished(q[i].st) && q[i].finished < oldest) { oldest = q[i].finished; slot = i; }
    }
    if (slot >= 0) {
        memset(&q[slot], 0, sizeof(q[slot]));
        q[slot].id = seq++;
        if (seq <= 0) seq = 1;
        strlcpy(q[slot].type, type, sizeof(q[slot].type));
        q[slot].pr = priority;
        q[slot].target_worker = worker_id;
        q[slot].st = JS_QUEUED;
        q[slot].created = esp_timer_get_time();
        id = q[slot].id;
    }
    xSemaphoreGive(mx);
    return id;
}

int job_create(const char *type, int priority) { return job_create_targeted(type, priority, 0); }

bool job_cancel(int id)
{
    if (!mx || id <= 0) return false;
    bool ok = false;
    uint8_t worker = 0;
    xSemaphoreTake(mx, portMAX_DELAY);
    for (int i = 0; i < JOB_MAX; i++) {
        if (q[i].id == id && (q[i].st == JS_QUEUED || q[i].st == JS_RUNNING)) {
            if (q[i].st == JS_RUNNING) worker = (uint8_t)q[i].worker;
            q[i].st = JS_CANCELLED;
            q[i].finished = esp_timer_get_time();
            ok = true;
            break;
        }
    }
    xSemaphoreGive(mx);
    if (ok && worker) (void)worker_cancel_job(worker);
    return ok;
}

size_t job_cancel_all(void)
{
    if (!mx) return 0;
    uint8_t workers[JOB_MAX];
    size_t count = 0, nw = 0;
    xSemaphoreTake(mx, portMAX_DELAY);
    for (int i = 0; i < JOB_MAX; ++i) {
        if (q[i].id && (q[i].st == JS_QUEUED || q[i].st == JS_RUNNING)) {
            if (q[i].st == JS_RUNNING && q[i].worker > 0) workers[nw++] = (uint8_t)q[i].worker;
            q[i].st = JS_CANCELLED;
            q[i].finished = esp_timer_get_time();
            count++;
        }
    }
    xSemaphoreGive(mx);
    for (size_t i = 0; i < nw; ++i) (void)worker_cancel_job(workers[i]);
    if (count) evlog_add('W', "jobs", "%u job(s) annulé(s)", (unsigned)count);
    return count;
}

size_t job_clear_finished(void)
{
    size_t n = 0;
    xSemaphoreTake(mx, portMAX_DELAY);
    for (int i = 0; i < JOB_MAX; ++i) {
        if (q[i].id && finished(q[i].st)) { memset(&q[i], 0, sizeof(q[i])); n++; }
    }
    xSemaphoreGive(mx);
    return n;
}

void job_stats(int *queued, int *running, int *done, int *failed)
{
    int a = 0, b = 0, c = 0, d = 0;
    if (mx) {
        xSemaphoreTake(mx, portMAX_DELAY);
        for (int i = 0; i < JOB_MAX; ++i) {
            if (!q[i].id) continue;
            if (q[i].st == JS_QUEUED) a++;
            else if (q[i].st == JS_RUNNING) b++;
            else if (q[i].st == JS_SUCCESS) c++;
            else if (finished(q[i].st)) d++;
        }
        xSemaphoreGive(mx);
    }
    if (queued) *queued = a;
    if (running) *running = b;
    if (done) *done = c;
    if (failed) *failed = d;
}

void job_to_json(cJSON *arr)
{
    if (!arr || !mx) return;
    job_t *copy = malloc(sizeof(q));
    if (!copy) return;
    xSemaphoreTake(mx, portMAX_DELAY);
    memcpy(copy, q, sizeof(q));
    xSemaphoreGive(mx);
    /* ordre : les plus récents d'abord */
    for (int pass = 0; pass < JOB_MAX; ++pass) {
        int best = -1;
        for (int i = 0; i < JOB_MAX; i++) if (copy[i].id && (best < 0 || copy[i].id > copy[best].id)) best = i;
        if (best < 0) break;
        const job_t *j = &copy[best];
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddNumberToObject(o, "id", j->id);
        cJSON_AddStringToObject(o, "type", j->type);
        cJSON_AddNumberToObject(o, "priority", j->pr);
        cJSON_AddNumberToObject(o, "worker", j->worker);
        cJSON_AddNumberToObject(o, "target_worker", j->target_worker);
        cJSON_AddNumberToObject(o, "retries", j->retries);
        cJSON_AddStringToObject(o, "status", state_name(j->st));
        cJSON_AddNumberToObject(o, "progress", j->progress);
        cJSON_AddStringToObject(o, "result", j->result);
        cJSON_AddNumberToObject(o, "created_ms", (double)(j->created / 1000));
        cJSON_AddNumberToObject(o, "started_ms", (double)(j->started / 1000));
        cJSON_AddNumberToObject(o, "finished_ms", (double)(j->finished / 1000));
        cJSON_AddItemToArray(arr, o);
        copy[best].id = 0;
    }
    free(copy);
}
