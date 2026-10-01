#include "reports.h"
#include "lab_config.h"
#include "event_log.h"
#include "job_engine.h"
#include "storage.h"
#include "telemetry.h"
#include "wifi_lab.h"
#include "worker_pool.h"
#include "cJSON.h"
#include "esp_heap_caps.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

void reports_init(void)
{
    if (storage_ready())
        storage_write_text("/sd/REPORTS/README.txt",
                           "Rapports JSON horodatés du MASTER (état, workers, jobs). Voir aussi jobs.csv et ../LOGS/.\n");
}

bool reports_write_snapshot(const char *kind, char *path_out, size_t cap)
{
    if (!kind || !*kind || !storage_ready()) return false;
    char p[96];
    time_t now = time(NULL);
    if (now > 1700000000) {
        struct tm tm;
        localtime_r(&now, &tm);
        char ts[20];
        strftime(ts, sizeof(ts), "%Y%m%d_%H%M%S", &tm);
        snprintf(p, sizeof(p), "/sd/REPORTS/%s_%s.json", kind, ts);
    } else {
        snprintf(p, sizeof(p), "/sd/REPORTS/%s_up%lld.json", kind, (long long)(esp_timer_get_time() / 1000000));
    }
    cJSON *r = cJSON_CreateObject();
    if (!r) return false;
    cJSON_AddStringToObject(r, "kind", kind);
    cJSON_AddStringToObject(r, "version", LAB_VERSION);
    cJSON_AddNumberToObject(r, "epoch", (double)(now > 1700000000 ? now : 0));
    cJSON_AddNumberToObject(r, "uptime_s", (double)(esp_timer_get_time() / 1000000));
    cJSON_AddNumberToObject(r, "heap", esp_get_free_heap_size());
    cJSON_AddNumberToObject(r, "heap_min", esp_get_minimum_free_heap_size());
    cJSON_AddNumberToObject(r, "psram", heap_caps_get_free_size(MALLOC_CAP_SPIRAM));
    cJSON_AddBoolToObject(r, "internet", wifi_lab_sta_connected());
    float t = telemetry_temp(), h = telemetry_humidity();
    if (!isnan(t)) { cJSON_AddNumberToObject(r, "temp_c", t); cJSON_AddNumberToObject(r, "humidity", h); }
    worker_pool_to_json(cJSON_AddArrayToObject(r, "workers"), true);
    job_to_json(cJSON_AddArrayToObject(r, "jobs"));
    char *s = cJSON_Print(r);
    cJSON_Delete(r);
    if (!s) return false;
    bool ok = storage_write_text(p, s) == ESP_OK;
    free(s);
    if (ok && path_out) strlcpy(path_out, p, cap);
    return ok;
}

static void reporter_task(void *arg)
{
    (void)arg;
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(60UL * 60UL * 1000UL)); /* rapport horaire */
        if (storage_ready()) reports_write_snapshot("hourly", NULL, 0);
    }
}

void reports_start(void)
{
    xTaskCreate(reporter_task, "reporter", 6144, NULL, 2, NULL);
}
