/* API REST du MASTER. Les routes publiques sont en lecture seule (ou jobs de diagnostic sans danger) ;
 * toutes les actions qui modifient la configuration, la microSD ou flashent une carte exigent une
 * session administrateur (cookie LABSESS obtenu via le chemin de contrôle privé). */
#include "web_server.h"
#include "lab_config.h"
#include "agent.h"
#include "bench.h"
#include "captive_dns.h"
#include "netmon.h"
#include "linktest.h"
#include "event_log.h"
#include "http_util.h"
#include "job_engine.h"
#include "led_status.h"
#include "notifications.h"
#include "ota_manager.h"
#include "reports.h"
#include "storage.h"
#include "telemetry.h"
#include "usb_avr.h"
#include "usb_flash.h"
#include "veille.h"
#include "wifi_lab.h"
#include "worker_pool.h"
#include "cJSON.h"
#include "esp_app_desc.h"
#include "esp_chip_info.h"
#include "esp_flash.h"
#include "esp_heap_caps.h"
#include "esp_idf_version.h"
#include "esp_mac.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <ctype.h>
#include <dirent.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

static int64_t s_agent_last_ms = 0;

static const char *reset_reason_name(esp_reset_reason_t r)
{
    switch (r) {
    case ESP_RST_POWERON: return "mise sous tension";
    case ESP_RST_EXT: return "reset externe";
    case ESP_RST_SW: return "redémarrage logiciel";
    case ESP_RST_PANIC: return "plantage (panic)";
    case ESP_RST_INT_WDT: return "watchdog interruption";
    case ESP_RST_TASK_WDT: return "watchdog tâche";
    case ESP_RST_WDT: return "watchdog";
    case ESP_RST_DEEPSLEEP: return "réveil deep-sleep";
    case ESP_RST_BROWNOUT: return "chute de tension (brownout)";
    case ESP_RST_USB: return "reset USB";
    default: return "inconnu";
    }
}

/* ======================= ÉTAT ======================= */

cJSON *web_state_json(bool detailed)
{
    cJSON *root = cJSON_CreateObject();
    if (!root) return NULL;
    cJSON *m = cJSON_AddObjectToObject(root, "master");
    cJSON_AddStringToObject(m, "version", LAB_VERSION);
    cJSON_AddStringToObject(m, "hostname", g_lab_cfg.hostname);
    cJSON_AddStringToObject(m, "ap_ssid", g_lab_cfg.ap_ssid);
    cJSON_AddStringToObject(m, "ap_ip", AP_IP_STR);
    cJSON_AddStringToObject(m, "sta_ip", wifi_lab_sta_ip());
    cJSON_AddBoolToObject(m, "internet", wifi_lab_sta_connected());
    cJSON_AddBoolToObject(m, "internet_shared", wifi_lab_internet_shared());
    cJSON_AddNumberToObject(m, "sta_rssi", wifi_lab_sta_rssi());
    cJSON_AddNumberToObject(m, "ap_clients", wifi_lab_ap_clients());
    cJSON_AddBoolToObject(m, "time_synced", wifi_lab_time_synced());
    cJSON_AddNumberToObject(m, "epoch", (double)time(NULL));
    cJSON_AddBoolToObject(m, "sd", storage_ready());
    cJSON_AddBoolToObject(m, "usb_avr", usb_avr_ready());
    cJSON_AddStringToObject(m, "led", led_status_current());
    cJSON_AddNumberToObject(m, "heap", esp_get_free_heap_size());
    cJSON_AddNumberToObject(m, "heap_min", esp_get_minimum_free_heap_size());
    cJSON_AddNumberToObject(m, "heap_internal", heap_caps_get_free_size(MALLOC_CAP_INTERNAL));
    cJSON_AddNumberToObject(m, "psram", heap_caps_get_free_size(MALLOC_CAP_SPIRAM));
    cJSON_AddNumberToObject(m, "psram_total", heap_caps_get_total_size(MALLOC_CAP_SPIRAM));
    cJSON_AddNumberToObject(m, "cpu_mhz", CONFIG_ESP_DEFAULT_CPU_FREQ_MHZ);
    cJSON_AddNumberToObject(m, "uptime_ms", (double)(esp_timer_get_time() / 1000));
    float t = telemetry_temp(), h = telemetry_humidity();
    if (isnan(t)) { cJSON_AddNullToObject(m, "temp"); cJSON_AddNullToObject(m, "humidity"); }
    else { cJSON_AddNumberToObject(m, "temp", roundf(t * 10) / 10); cJSON_AddNumberToObject(m, "humidity", roundf(h * 10) / 10); }
    int q = 0, run = 0, ok = 0, ko = 0;
    job_stats(&q, &run, &ok, &ko);
    cJSON *js = cJSON_AddObjectToObject(root, "jobs");
    cJSON_AddNumberToObject(js, "queued", q);
    cJSON_AddNumberToObject(js, "running", run);
    cJSON_AddNumberToObject(js, "success", ok);
    cJSON_AddNumberToObject(js, "failed", ko);
    cJSON_AddNumberToObject(root, "worker_capacity", WORKER_MAX);
    worker_pool_to_json(cJSON_AddArrayToObject(root, "workers"), detailed);
    telemetry_feeds_json(cJSON_AddArrayToObject(root, "feeds"));
    bench_status_json(cJSON_AddObjectToObject(root, "bench"), false);
    netmon_summary_json(cJSON_AddObjectToObject(root, "netmon"));
    veille_summary_json(cJSON_AddObjectToObject(root, "veille"));
    cJSON_AddNumberToObject(root, "event_seq", evlog_last_seq());
    return root;
}

static esp_err_t state_get(httpd_req_t *r) { return http_json(r, web_state_json(true)); }

static esp_err_t health_get(httpd_req_t *r)
{
    cJSON *j = cJSON_CreateObject();
    size_t total = worker_pool_count(), online = worker_pool_online();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "version", LAB_VERSION);
    cJSON_AddNumberToObject(j, "capacity", WORKER_MAX);
    cJSON_AddNumberToObject(j, "seen", total);
    cJSON_AddNumberToObject(j, "online", online);
    cJSON_AddNumberToObject(j, "offline", total - online);
    cJSON_AddNumberToObject(j, "queue_limit", JOB_MAX);
    cJSON_AddNumberToObject(j, "heap", esp_get_free_heap_size());
    linktest_summary_json(cJSON_AddObjectToObject(j, "link"));
    return http_json(r, j);
}

static esp_err_t system_info_get(httpd_req_t *r)
{
    cJSON *j = cJSON_CreateObject();
    esp_chip_info_t chip = {0};
    esp_chip_info(&chip);
    uint32_t flash = 0;
    esp_flash_get_size(NULL, &flash);
    uint8_t mac[6] = {0};
    esp_read_mac(mac, ESP_MAC_WIFI_SOFTAP);
    char macs[18];
    snprintf(macs, sizeof(macs), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    cJSON_AddStringToObject(j, "version", LAB_VERSION);
    cJSON_AddStringToObject(j, "codename", LAB_CODENAME);
    cJSON_AddStringToObject(j, "idf", esp_get_idf_version());
    cJSON_AddStringToObject(j, "target", CONFIG_IDF_TARGET);
    cJSON_AddNumberToObject(j, "chip_revision", chip.revision);
    cJSON_AddNumberToObject(j, "cores", chip.cores);
    cJSON_AddNumberToObject(j, "flash_size", flash);
    cJSON_AddNumberToObject(j, "psram_total", heap_caps_get_total_size(MALLOC_CAP_SPIRAM));
    cJSON_AddStringToObject(j, "ap_mac", macs);
    cJSON_AddStringToObject(j, "reset_reason", reset_reason_name(esp_reset_reason()));
    cJSON_AddStringToObject(j, "board_variant", g_lab_cfg.board_variant);
    cJSON_AddNumberToObject(j, "worker_capacity", WORKER_MAX);
    cJSON_AddNumberToObject(j, "job_capacity", JOB_MAX);
    cJSON_AddBoolToObject(j, "captive_portal", captive_dns_running());
    cJSON_AddNumberToObject(j, "uptime_ms", (double)(esp_timer_get_time() / 1000));
    uint64_t tot = 0, fre = 0;
    if (storage_usage(&tot, &fre) == ESP_OK) {
        cJSON_AddNumberToObject(j, "sd_total", (double)tot);
        cJSON_AddNumberToObject(j, "sd_free", (double)fre);
    }
    ota_info_json(cJSON_AddObjectToObject(j, "ota"));
    usb_avr_info_json(cJSON_AddObjectToObject(j, "usb"));
    return http_json(r, j);
}

static esp_err_t telemetry_get(httpd_req_t *r)
{
    cJSON *j = cJSON_CreateObject();
    telemetry_history_json(j);
    return http_json(r, j);
}

static esp_err_t events_get(httpd_req_t *r)
{
    char v[16];
    uint32_t since = query_get(r, "since", v, sizeof(v)) ? (uint32_t)strtoul(v, NULL, 10) : 0;
    cJSON *j = cJSON_CreateObject();
    cJSON_AddNumberToObject(j, "last", evlog_last_seq());
    evlog_to_json(cJSON_AddArrayToObject(j, "events"), since, 96);
    return http_json(r, j);
}

/* ======================= WIRESHARK DU LABO ======================= */

static esp_err_t netmon_get(httpd_req_t *r)
{
    char v[16];
    uint32_t since = query_get(r, "since", v, sizeof(v)) ? (uint32_t)strtoul(v, NULL, 10) : 0;
    cJSON *j = cJSON_CreateObject();
    if (!j) return http_error(r, 500, "mémoire insuffisante");
    cJSON_AddBoolToObject(j, "armed", netmon_armed());
    uint32_t last = netmon_frames_json(cJSON_AddArrayToObject(j, "frames"), since);
    cJSON_AddNumberToObject(j, "last", last);
    netmon_metrics_json(cJSON_AddArrayToObject(j, "metrics"));
    return http_json(r, j);
}

static esp_err_t netmon_arm_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *b = http_body_json(r, 256);
    bool on = b && cJSON_IsTrue(cJSON_GetObjectItem(b, "on"));
    cJSON_Delete(b);
    netmon_arm(on);
    evlog_add('I', "netmon", on ? "capture réseau armée" : "capture réseau arrêtée");
    return http_json_str(r, on ? "{\"ok\":true,\"armed\":true}" : "{\"ok\":true,\"armed\":false}");
}

/* ======================= JOBS ======================= */

static esp_err_t jobs_get(httpd_req_t *r)
{
    cJSON *a = cJSON_CreateArray();
    job_to_json(a);
    return http_json(r, a);
}

static esp_err_t job_post(httpd_req_t *r)
{
    char *b = http_body(r, 256);
    if (!b) return http_error(r, 400, "corps invalide");
    char type[32] = {0}, pr[12] = {0}, wid[8] = {0};
    form_get(b, "type", type, sizeof(type));
    form_get(b, "priority", pr, sizeof(pr));
    form_get(b, "worker", wid, sizeof(wid));
    free(b);
    for (char *p = type; *p; ++p) *p = (char)toupper((unsigned char)*p);
    if (!job_type_valid(type)) return http_error(r, 400, "type de job inconnu");
    int target = atoi(wid);
    if (target < 0 || target > WORKER_MAX) return http_error(r, 400, "worker invalide");
    int id = job_create_targeted(type, pr[0] ? atoi(pr) : 50, (uint8_t)target);
    if (id <= 0) return http_error(r, 503, "file de jobs pleine");
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "accepted", true);
    cJSON_AddNumberToObject(j, "id", id);
    cJSON_AddNumberToObject(j, "target_worker", target);
    return http_json(r, j);
}

static esp_err_t job_cancel_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char *b = http_body(r, 128);
    char idv[16] = {0};
    if (b) { form_get(b, "id", idv, sizeof(idv)); free(b); }
    bool ok = job_cancel(atoi(idv));
    return http_json_str(r, ok ? "{\"ok\":true}" : "{\"ok\":false,\"error\":\"job introuvable ou terminé\"}");
}

static esp_err_t job_cancel_all_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddNumberToObject(j, "cancelled", job_cancel_all());
    return http_json(r, j);
}

static esp_err_t jobs_clear_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddNumberToObject(j, "cleared", job_clear_finished());
    return http_json(r, j);
}

static esp_err_t fleet_job(httpd_req_t *r, const char *type, int priority)
{
    worker_info_t *snap = calloc(WORKER_MAX, sizeof(worker_info_t));
    if (!snap) return http_error(r, 500, "mémoire");
    size_t n = worker_pool_snapshot(snap, WORKER_MAX), accepted = 0;
    for (size_t i = 0; i < n; i++)
        if (strcmp(snap[i].state, "OFFLINE") != 0 && strcmp(snap[i].state, "PROJECT") != 0 && job_create_targeted(type, priority, snap[i].id) > 0) accepted++;
    free(snap);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "type", type);
    cJSON_AddNumberToObject(j, "accepted", accepted);
    return http_json(r, j);
}

static esp_err_t fleet_post(httpd_req_t *r)
{
    char *b = http_body(r, 128);
    char type[32] = {0};
    if (b) { form_get(b, "type", type, sizeof(type)); free(b); }
    for (char *p = type; *p; ++p) *p = (char)toupper((unsigned char)*p);
    if (!job_type_valid(type)) return http_error(r, 400, "type de job inconnu");
    return fleet_job(r, type, 60);
}

static esp_err_t fleet_ping_post(httpd_req_t *r) { return fleet_job(r, "PING", 20); }
static esp_err_t fleet_benchmark_post(httpd_req_t *r) { return fleet_job(r, "BENCHMARK", 70); }

static esp_err_t fleet_reboot_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    worker_info_t *snap = calloc(WORKER_MAX, sizeof(worker_info_t));
    if (!snap) return http_error(r, 500, "mémoire");
    size_t n = worker_pool_snapshot(snap, WORKER_MAX), accepted = 0;
    for (size_t i = 0; i < n; i++)
        if (strcmp(snap[i].state, "OFFLINE") != 0 && strcmp(snap[i].state, "PROJECT") != 0 && worker_reboot(snap[i].id) == ESP_OK) accepted++;
    free(snap);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddNumberToObject(j, "accepted", accepted);
    return http_json(r, j);
}

/* ======================= WORKERS ======================= */

static int body_worker_id(httpd_req_t *r, char *extra_key, char *extra, size_t cap)
{
    char *b = http_body(r, 512);
    char idv[8] = {0};
    if (!b) return -1;
    form_get(b, "id", idv, sizeof(idv));
    if (extra_key && extra) form_get(b, extra_key, extra, cap);
    free(b);
    int id = atoi(idv);
    return (id >= 1 && id <= WORKER_MAX) ? id : -1;
}

static esp_err_t worker_info_get(httpd_req_t *r)
{
    char idv[8];
    if (!query_get(r, "id", idv, sizeof(idv))) return http_error(r, 400, "id manquant");
    int id = atoi(idv);
    if (id < 1 || id > WORKER_MAX) return http_error(r, 400, "id invalide");
    char *buf = malloc(3072);
    if (!buf) return http_error(r, 500, "mémoire");
    int st = 0;
    esp_err_t e = worker_http_get((uint8_t)id, "/api/info", buf, 3072, &st);
    if (e != ESP_OK || st != 200) { free(buf); return http_error(r, 503, "worker injoignable"); }
    esp_err_t out = http_json_str(r, buf);
    free(buf);
    return out;
}

static esp_err_t worker_log_get(httpd_req_t *r)
{
    char v[16];
    int id = query_get(r, "id", v, sizeof(v)) ? atoi(v) : 0;
    uint32_t since = query_get(r, "since", v, sizeof(v)) ? (uint32_t)strtoul(v, NULL, 10) : 0;
    if (id < 0 || id > WORKER_MAX) return http_error(r, 400, "id invalide");
    cJSON *j = cJSON_CreateObject();
    if (!j) return http_error(r, 500, "mémoire");
    uint32_t last = worker_log_json(cJSON_AddArrayToObject(j, "lines"), (uint8_t)id, since);
    cJSON_AddNumberToObject(j, "last", last);
    return http_json(r, j);
}

/* Panneau GPIO : GET ?id=N[&pin=P] relayé vers GET /api/gpio du worker. */
static esp_err_t worker_gpio_get(httpd_req_t *r)
{
    char v[16], path[48];
    int id = query_get(r, "id", v, sizeof(v)) ? atoi(v) : 0;
    if (id < 1 || id > WORKER_MAX) return http_error(r, 400, "id invalide");
    if (query_get(r, "pin", v, sizeof(v))) snprintf(path, sizeof(path), "/api/gpio?pin=%d", atoi(v));
    else strlcpy(path, "/api/gpio", sizeof(path));
    char *buf = malloc(2048);
    if (!buf) return http_error(r, 500, "mémoire");
    int st = 0;
    esp_err_t e = worker_http_get((uint8_t)id, path, buf, 2048, &st);
    if (e != ESP_OK || st != 200) {
        esp_err_t out = http_error(r, st == 404 ? 501 : 503, st == 404 ? "firmware worker trop ancien : mettez-le à jour (6.1)" : buf[0] ? buf : "worker injoignable");
        free(buf);
        return out;
    }
    esp_err_t out = http_json_str(r, buf);
    free(buf);
    return out;
}

/* POST JSON {id, pin, mode, value?, freq?, duty?} relayé vers POST /api/gpio du worker. */
static esp_err_t worker_gpio_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *b = http_body_json(r, 512);
    if (!b) return http_error(r, 400, "JSON invalide");
    const cJSON *id = cJSON_GetObjectItem(b, "id"), *pin = cJSON_GetObjectItem(b, "pin"), *mode = cJSON_GetObjectItem(b, "mode");
    const cJSON *value = cJSON_GetObjectItem(b, "value"), *freq = cJSON_GetObjectItem(b, "freq"), *duty = cJSON_GetObjectItem(b, "duty");
    char form[160] = "";
    bool ok = cJSON_IsNumber(id) && id->valueint >= 1 && id->valueint <= WORKER_MAX && cJSON_IsNumber(pin) && cJSON_IsString(mode) &&
              strspn(mode->valuestring, "abcdefghijklmnopqrstuvwxyz_") == strlen(mode->valuestring) && strlen(mode->valuestring) < 16;
    int wid = ok ? id->valueint : 0;
    if (ok) snprintf(form, sizeof(form), "pin=%d&mode=%s&value=%d&freq=%d&duty=%.1f", pin->valueint, mode->valuestring,
                     cJSON_IsNumber(value) ? value->valueint : 0, cJSON_IsNumber(freq) ? freq->valueint : 1000,
                     cJSON_IsNumber(duty) ? duty->valuedouble : 0.0);
    cJSON_Delete(b);
    if (!ok) return http_error(r, 400, "champs id, pin et mode requis");
    char resp[256];
    int st = 0;
    esp_err_t e = worker_http_post((uint8_t)wid, "/api/gpio", form, 4000, resp, sizeof(resp), &st);
    if (e != ESP_OK) return http_error(r, st == 409 ? 409 : st == 400 ? 400 : 503, resp[0] ? resp : "worker injoignable");
    return http_json_str(r, resp);
}

static esp_err_t worker_scan_get(httpd_req_t *r)
{
    char idv[8], start[4] = {0};
    if (!query_get(r, "id", idv, sizeof(idv))) return http_error(r, 400, "id manquant");
    query_get(r, "start", start, sizeof(start));
    int id = atoi(idv);
    if (id < 1 || id > WORKER_MAX) return http_error(r, 400, "id invalide");
    char *buf = malloc(4096);
    if (!buf) return http_error(r, 500, "mémoire");
    int st = 0;
    esp_err_t e = worker_http_get((uint8_t)id, start[0] == '1' ? "/api/scan?start=1" : "/api/scan", buf, 4096, &st);
    if (e != ESP_OK) { free(buf); return http_error(r, 503, "worker injoignable"); }
    esp_err_t out = http_json_str(r, buf);
    free(buf);
    return out;
}

static esp_err_t worker_reboot_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    int id = body_worker_id(r, NULL, NULL, 0);
    if (id < 0) return http_error(r, 400, "id invalide");
    esp_err_t e = worker_reboot((uint8_t)id);
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 503, esp_err_to_name(e));
}

static esp_err_t worker_label_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char label[32] = {0};
    int id = body_worker_id(r, "label", label, sizeof(label));
    if (id < 0) return http_error(r, 400, "id invalide");
    esp_err_t e = worker_set_label((uint8_t)id, label);
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 404, "worker introuvable");
}

static esp_err_t worker_forget_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    int id = body_worker_id(r, NULL, NULL, 0);
    if (id < 0) return http_error(r, 400, "id invalide");
    esp_err_t e = worker_forget((uint8_t)id);
    if (e == ESP_ERR_INVALID_STATE) return http_error(r, 409, "le worker est en ligne");
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 404, "worker introuvable");
}

static esp_err_t worker_flash_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char *b = http_body(r, 512);
    if (!b) return http_error(r, 400, "corps invalide");
    char idv[8] = {0}, path[240] = {0}, mode[12] = {0};
    form_get(b, "id", idv, sizeof(idv));
    form_get(b, "path", path, sizeof(path));
    form_get(b, "mode", mode, sizeof(mode));
    free(b);
    int id = atoi(idv);
    if (id < 1 || id > WORKER_MAX) return http_error(r, 400, "id invalide");
    if (!storage_path_valid(path, false)) return http_error(r, 400, "chemin invalide");
    size_t pl = strlen(path);
    if (pl < 5 || strcasecmp(path + pl - 4, ".bin") != 0) return http_error(r, 400, "un fichier .bin est attendu");
    esp_err_t e = worker_flash((uint8_t)id, path, strcmp(mode, "project") == 0);
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 503, esp_err_to_name(e));
}

static esp_err_t worker_flash_remote_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char *b = http_body(r, 1200);
    if (!b) return http_error(r, 400, "corps invalide");
    char idv[8] = {0}, url[600] = {0}, digest[65] = {0}, mode[16] = {0};
    form_get(b, "id", idv, sizeof(idv));
    form_get(b, "url", url, sizeof(url));
    form_get(b, "sha256", digest, sizeof(digest));
    form_get(b, "mode", mode, sizeof(mode));
    free(b);
    int id = atoi(idv);
    if (id < 1 || id > WORKER_MAX) return http_error(r, 400, "id invalide");
    if (mode[0] && strcmp(mode, "project") != 0 && strcmp(mode, "firmware") != 0)
        return http_error(r, 400, "mode invalide");
    if (strncmp(url, "http://192.168.4.", 17) != 0 || !strstr(url, ":8088/download/firmware/") || !strstr(url, ".bin"))
        return http_error(r, 400, "URL Pi refusée : attendu http://192.168.4.x:8088/download/firmware/… signé");
    if (strlen(digest) != 64) return http_error(r, 400, "SHA-256 absent");
    esp_err_t e = worker_flash_remote((uint8_t)id, url, digest, strcmp(mode, "firmware") != 0);
    return e == ESP_OK ? http_json_str(r, strcmp(mode, "firmware") == 0 ? "{\"ok\":true,\"source\":\"pi\",\"mode\":\"firmware\"}" : "{\"ok\":true,\"source\":\"pi\",\"mode\":\"project\"}") : http_error(r, 503, esp_err_to_name(e));
}

static esp_err_t worker_home_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    int id = body_worker_id(r, NULL, NULL, 0);
    if (id < 0) return http_error(r, 400, "id invalide");
    esp_err_t e = worker_go_home((uint8_t)id);
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 404, "worker injoignable");
}

/* ======================= BANC FANTÔME ======================= */

/* Corps JSON : {"plan":{…LAB.benchPayload()…},"bin":"/sd/FIRMWARE/WORKER/….bin","dut":2,"emu":3} */
static esp_err_t bench_run_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *b = http_body_json(r, 48 * 1024);
    if (!b) return http_error(r, 400, "JSON invalide ou trop volumineux");
    const cJSON *plan = cJSON_GetObjectItem(b, "plan");
    const cJSON *bin = cJSON_GetObjectItem(b, "bin");
    const cJSON *dut = cJSON_GetObjectItem(b, "dut");
    const cJSON *emu = cJSON_GetObjectItem(b, "emu");
    char err[160] = "";
    esp_err_t e = ESP_ERR_INVALID_ARG;
    if (!cJSON_IsObject(plan) || !cJSON_IsString(bin) || !cJSON_IsNumber(dut) || !cJSON_IsNumber(emu)) {
        snprintf(err, sizeof(err), "champs plan, bin, dut et emu requis");
    } else {
        size_t pl = strlen(bin->valuestring);
        if (!storage_path_valid(bin->valuestring, false) || pl < 5 || strcasecmp(bin->valuestring + pl - 4, ".bin") != 0)
            snprintf(err, sizeof(err), "un fichier .bin de la microSD est attendu");
        else
            e = bench_run(plan, bin->valuestring, (uint8_t)dut->valueint, (uint8_t)emu->valueint, err, sizeof(err));
    }
    cJSON_Delete(b);
    if (e == ESP_OK) return http_json_str(r, "{\"ok\":true}");
    return http_error(r, e == ESP_ERR_INVALID_STATE ? 409 : e == ESP_ERR_NOT_FOUND ? 404 : 400, err[0] ? err : esp_err_to_name(e));
}

static esp_err_t bench_status_get(httpd_req_t *r)
{
    cJSON *o = cJSON_CreateObject();
    if (!o) return http_error(r, 500, "mémoire insuffisante");
    bench_status_json(o, true);
    return http_json(r, o);
}

static esp_err_t bench_stop_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    bench_stop();
    return http_json_str(r, "{\"ok\":true}");
}

static esp_err_t worker_discover_post(httpd_req_t *r)
{
    worker_pool_discover();
    return http_json_str(r, "{\"ok\":true}");
}

static esp_err_t fw_local_get(httpd_req_t *r)
{
    const char *token = strrchr(r->uri, '/');
    if (!token || !*(++token)) return http_error(r, 404, "jeton");
    const char *p = ota_local_path_for_token(token);
    if (!p) return http_error(r, 404, "jeton expiré");
    FILE *f = fopen(p, "rb");
    if (!f) return http_error(r, 404, "fichier");
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    rewind(f);
    char len[16];
    snprintf(len, sizeof(len), "%ld", sz);
    httpd_resp_set_type(r, "application/octet-stream");
    char *b = malloc(4096);
    esp_err_t e = ESP_OK;
    size_t n;
    while (b && (n = fread(b, 1, 4096, f)) > 0) {
        if ((e = httpd_resp_send_chunk(r, b, n)) != ESP_OK) break;
    }
    free(b);
    fclose(f);
    (void)len;
    return e == ESP_OK ? httpd_resp_send_chunk(r, NULL, 0) : e;
}

/* ======================= MICRO-SD ======================= */

static bool public_sd_path(const char *p)
{
    static const char *ok[] = {"/sd/PROJECTS", "/sd/FIRMWARE", "/sd/COMPONENTS", "/sd/TESTS", "/sd/REPORTS", "/sd/DATABASE"};
    if (!strcmp(p, "/sd")) return true;
    for (size_t i = 0; i < sizeof(ok) / sizeof(ok[0]); i++) {
        size_t l = strlen(ok[i]);
        if (strncmp(p, ok[i], l) == 0 && (p[l] == 0 || p[l] == '/')) return true;
    }
    return false;
}

static esp_err_t sd_list_get(httpd_req_t *r)
{
    char path[240] = "/sd";
    query_get(r, "path", path, sizeof(path));
    if (!path[0]) strlcpy(path, "/sd", sizeof(path));
    if (!storage_ready()) return http_error(r, 503, "microSD absente");
    if (!storage_path_valid(path, true)) return http_error(r, 400, "chemin invalide");
    bool admin = web_is_admin(r);
    if (!admin && !public_sd_path(path)) return http_error(r, 401, "dossier réservé à l'administrateur");
    cJSON *j = cJSON_CreateObject();
    cJSON_AddStringToObject(j, "path", path);
    cJSON_AddBoolToObject(j, "admin", admin);
    cJSON *items = cJSON_AddArrayToObject(j, "items");
    esp_err_t e = storage_list_json(path, items, 400);
    if (e != ESP_OK) { cJSON_Delete(j); return http_error(r, 404, "dossier introuvable"); }
    uint64_t tot = 0, fre = 0;
    if (storage_usage(&tot, &fre) == ESP_OK) {
        cJSON_AddNumberToObject(j, "total", (double)tot);
        cJSON_AddNumberToObject(j, "free", (double)fre);
    }
    return http_json(r, j);
}

static esp_err_t sd_download_get(httpd_req_t *r)
{
    char path[240] = {0};
    if (!query_get(r, "path", path, sizeof(path)) || !storage_path_valid(path, false))
        return http_error(r, 400, "chemin invalide");
    if (!public_sd_path(path) && !web_is_admin(r)) return http_error(r, 401, "fichier réservé à l'administrateur");
    struct stat st;
    if (stat(path, &st) != 0 || S_ISDIR(st.st_mode)) return http_error(r, 404, "fichier introuvable");
    FILE *f = fopen(path, "rb");
    if (!f) return http_error(r, 404, "fichier introuvable");
    const char *name = strrchr(path, '/') + 1;
    char disp[160], inl[4] = "";
    /* ?inline=1 : affichage direct dans l'interface (montages .png/.svg, textes) avec le bon type MIME. */
    bool inline_view = query_get(r, "inline", inl, sizeof(inl)) && inl[0] == '1';
    const char *ext = strrchr(name, '.');
    const char *type = "application/octet-stream";
    if (inline_view && ext) {
        if (!strcasecmp(ext, ".png")) type = "image/png";
        else if (!strcasecmp(ext, ".jpg") || !strcasecmp(ext, ".jpeg")) type = "image/jpeg";
        else if (!strcasecmp(ext, ".svg")) type = "image/svg+xml";
        else if (!strcasecmp(ext, ".pdf")) type = "application/pdf";
        else if (!strcasecmp(ext, ".md") || !strcasecmp(ext, ".txt") || !strcasecmp(ext, ".ino") || !strcasecmp(ext, ".csv") ||
                 !strcasecmp(ext, ".json") || !strcasecmp(ext, ".h") || !strcasecmp(ext, ".cpp") || !strcasecmp(ext, ".log"))
            type = "text/plain; charset=utf-8";
    }
    snprintf(disp, sizeof(disp), "%s; filename=\"%s\"", inline_view ? "inline" : "attachment", name);
    httpd_resp_set_type(r, type);
    httpd_resp_set_hdr(r, "Content-Disposition", disp);
    if (inline_view) httpd_resp_set_hdr(r, "Cache-Control", "max-age=300");
    char *b = malloc(4096);
    esp_err_t e = b ? ESP_OK : ESP_ERR_NO_MEM;
    size_t n;
    while (b && (n = fread(b, 1, 4096, f)) > 0)
        if ((e = httpd_resp_send_chunk(r, b, n)) != ESP_OK) break;
    free(b);
    fclose(f);
    return e == ESP_OK ? httpd_resp_send_chunk(r, NULL, 0) : e;
}

static esp_err_t receive_to_file(httpd_req_t *r, const char *path)
{
    char tmp[248];
    snprintf(tmp, sizeof(tmp), "%s.part", path);
    FILE *f = fopen(tmp, "wb");
    if (!f) return ESP_FAIL;
    char *b = malloc(4096);
    if (!b) { fclose(f); remove(tmp); return ESP_ERR_NO_MEM; }
    size_t rem = r->content_len;
    esp_err_t e = ESP_OK;
    int timeouts = 0;
    while (rem > 0) {
        int n = httpd_req_recv(r, b, rem > 4096 ? 4096 : rem);
        if (n == HTTPD_SOCK_ERR_TIMEOUT && ++timeouts < 5) continue;
        if (n <= 0 || fwrite(b, 1, (size_t)n, f) != (size_t)n) { e = ESP_FAIL; break; }
        rem -= (size_t)n;
    }
    free(b);
    fclose(f);
    if (e != ESP_OK) { remove(tmp); return e; }
    remove(path);
    return rename(tmp, path) == 0 ? ESP_OK : ESP_FAIL;
}

static esp_err_t sd_upload_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    if (!storage_ready()) return http_error(r, 503, "microSD absente");
    if (r->content_len > MAX_UPLOAD_BYTES) return http_error(r, 413, "fichier trop volumineux (8 Mo max)");
    char path[240] = {0};
    if (httpd_req_get_hdr_value_str(r, "X-Path", path, sizeof(path)) != ESP_OK) return http_error(r, 400, "en-tête X-Path manquant");
    url_decode_inplace(path);
    if (!storage_path_valid(path, false)) return http_error(r, 400, "chemin invalide");
    if (receive_to_file(r, path) != ESP_OK) return http_error(r, 500, "écriture impossible");
    char sha[65] = {0};
    storage_sha256_file(path, sha);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "path", path);
    cJSON_AddStringToObject(j, "sha256", sha);
    evlog_add('I', "sd", "fichier reçu : %s", path);
    return http_json(r, j);
}

static esp_err_t sd_path_action(httpd_req_t *r, const char *action)
{
    REQUIRE_ADMIN(r);
    char *b = http_body(r, 600);
    char path[240] = {0}, to[240] = {0};
    if (b) { form_get(b, "path", path, sizeof(path)); form_get(b, "to", to, sizeof(to)); free(b); }
    if (!storage_path_valid(path, false)) return http_error(r, 400, "chemin invalide");
    static const char *protected_dirs[] = {"/sd/PROJECTS", "/sd/FIRMWARE", "/sd/LOGS", "/sd/REPORTS", "/sd/CONFIG", "/sd/INBOX"};
    esp_err_t e;
    if (!strcmp(action, "delete")) {
        for (size_t i = 0; i < sizeof(protected_dirs) / sizeof(protected_dirs[0]); i++)
            if (!strcmp(path, protected_dirs[i])) return http_error(r, 409, "dossier système protégé");
        e = storage_delete(path);
        if (e == ESP_ERR_INVALID_STATE) return http_error(r, 409, "le dossier n'est pas vide");
    } else if (!strcmp(action, "mkdir")) {
        e = storage_mkdir(path);
    } else {
        if (!storage_path_valid(to, false)) return http_error(r, 400, "destination invalide");
        e = storage_rename(path, to);
        if (e == ESP_ERR_INVALID_STATE) return http_error(r, 409, "la destination existe déjà");
    }
    if (e == ESP_ERR_NOT_FOUND) return http_error(r, 404, "introuvable");
    if (e != ESP_OK) return http_error(r, 500, esp_err_to_name(e));
    evlog_add('I', "sd", "%s : %s", action, path);
    return http_json_str(r, "{\"ok\":true}");
}

static esp_err_t sd_delete_post(httpd_req_t *r) { return sd_path_action(r, "delete"); }
static esp_err_t sd_mkdir_post(httpd_req_t *r) { return sd_path_action(r, "mkdir"); }
static esp_err_t sd_rename_post(httpd_req_t *r) { return sd_path_action(r, "rename"); }

/* ======================= PROJETS ======================= */

static bool project_file_ok(const char *name)
{
    if (!storage_name_valid(name)) return false;
    const char *dot = strrchr(name, '.');
    if (!dot) return false;
    static const char *ok[] = {".ino", ".cpp", ".c", ".h", ".hpp", ".json", ".md", ".txt", ".bin", ".hex", ".csv", ".pdf", ".png", ".jpg", ".svg"};
    for (size_t i = 0; i < sizeof(ok) / sizeof(ok[0]); ++i) if (strcasecmp(dot, ok[i]) == 0) return true;
    return false;
}

static esp_err_t projects_get(httpd_req_t *r)
{
    if (!storage_ready()) return http_error(r, 503, "microSD absente");
    static const char *roots[] = {"/sd/PROJECTS/MY_PROJECTS", "/sd/PROJECTS/IMPORTED", "/sd/PROJECTS/LIBRARY"};
    cJSON *a = cJSON_CreateArray();
    for (size_t ri = 0; ri < sizeof(roots) / sizeof(roots[0]); ++ri) {
        DIR *d = opendir(roots[ri]);
        if (!d) continue;
        struct dirent *e;
        int count = 0;
        while ((e = readdir(d)) && count < 400) {
            if (e->d_type != DT_DIR || !storage_name_valid(e->d_name)) continue;
            cJSON *o = cJSON_CreateObject();
            char full[300];
            snprintf(full, sizeof(full), "%s/%s", roots[ri], e->d_name);
            cJSON_AddStringToObject(o, "name", e->d_name);
            cJSON_AddStringToObject(o, "path", full);
            cJSON_AddStringToObject(o, "group", ri == 0 ? "mine" : (ri == 1 ? "imported" : "library"));
            cJSON_AddItemToArray(a, o);
            count++;
        }
        closedir(d);
    }
    return http_json(r, a);
}

static esp_err_t project_mkdir_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char *b = http_body(r, 256);
    char name[100] = {0};
    if (b) { form_get(b, "name", name, sizeof(name)); free(b); }
    if (!storage_name_valid(name)) return http_error(r, 400, "nom invalide (lettres, chiffres, - _ . espace)");
    char path[MAX_PROJECT_PATH_BYTES];
    snprintf(path, sizeof(path), "/sd/PROJECTS/MY_PROJECTS/%s", name);
    esp_err_t e = storage_mkdir(path);
    if (e != ESP_OK) return http_error(r, 500, esp_err_to_name(e));
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "path", path);
    return http_json(r, j);
}

static esp_err_t project_upload_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    if (!storage_ready()) return http_error(r, 503, "microSD absente");
    if (r->content_len > MAX_UPLOAD_BYTES) return http_error(r, 413, "fichier trop volumineux");
    char project[100] = {0}, file[100] = {0};
    if (httpd_req_get_hdr_value_str(r, "X-Project", project, sizeof(project)) != ESP_OK ||
        httpd_req_get_hdr_value_str(r, "X-Filename", file, sizeof(file)) != ESP_OK)
        return http_error(r, 400, "en-têtes X-Project / X-Filename manquants");
    url_decode_inplace(project);
    url_decode_inplace(file);
    if (!storage_name_valid(project) || !project_file_ok(file)) return http_error(r, 400, "nom de projet ou de fichier invalide");
    char dir[MAX_PROJECT_PATH_BYTES], path[MAX_PROJECT_PATH_BYTES];
    snprintf(dir, sizeof(dir), "/sd/PROJECTS/MY_PROJECTS/%s", project);
    if (storage_mkdir(dir) != ESP_OK) return http_error(r, 500, "création du dossier impossible");
    int w = snprintf(path, sizeof(path), "%s/%s", dir, file);
    if (w < 0 || (size_t)w >= 240) return http_error(r, 400, "chemin trop long");
    if (receive_to_file(r, path) != ESP_OK) return http_error(r, 500, "écriture impossible");
    char sha[65] = {0};
    storage_sha256_file(path, sha);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "path", path);
    cJSON_AddStringToObject(j, "sha256", sha);
    evlog_add('I', "projets", "fichier %s ajouté au projet %s", file, project);
    return http_json(r, j);
}

static esp_err_t project_import_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    esp_err_t e = storage_import_inbox();
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 503, "microSD absente");
}

/* ======================= USB / AVR ======================= */

static esp_err_t avr_flash_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char *b = http_body(r, 512);
    char path[240] = {0}, profile[40] = {0};
    if (b) { form_get(b, "path", path, sizeof(path)); form_get(b, "profile", profile, sizeof(profile)); free(b); }
    if (!storage_path_valid(path, false)) return http_error(r, 400, "chemin invalide");
    char result[200] = {0};
    esp_err_t e = usb_avr_flash_hex(path, profile, result, sizeof(result));
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", e == ESP_OK);
    cJSON_AddStringToObject(j, "message", result);
    return http_json(r, j);
}

/* Programmation par câble en tâche de fond : {kind:"avr"|"esp", path, profile?} → suivi par /api/usb/flash/status. */
static esp_err_t usb_flash_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *b = http_body_json(r, 1024);
    if (!b) return http_error(r, 400, "JSON invalide");
    const cJSON *kind = cJSON_GetObjectItem(b, "kind"), *path = cJSON_GetObjectItem(b, "path"), *profile = cJSON_GetObjectItem(b, "profile");
    char err[160] = "";
    esp_err_t e = ESP_ERR_INVALID_ARG;
    if (!cJSON_IsString(kind) || !cJSON_IsString(path) || !storage_path_valid(path->valuestring, false)) {
        snprintf(err, sizeof(err), "champs kind et path requis (fichier de la microSD)");
    } else {
        size_t pl = strlen(path->valuestring);
        bool is_hex = pl > 4 && !strcasecmp(path->valuestring + pl - 4, ".hex");
        bool is_bin = pl > 4 && !strcasecmp(path->valuestring + pl - 4, ".bin");
        if (!strcmp(kind->valuestring, "avr")) {
            if (!is_hex) snprintf(err, sizeof(err), "un fichier .hex est attendu pour une carte Arduino");
            else e = usb_flash_start_avr(path->valuestring, cJSON_IsString(profile) ? profile->valuestring : "", err, sizeof(err));
        } else if (!strcmp(kind->valuestring, "esp")) {
            if (!is_bin) snprintf(err, sizeof(err), "un fichier .bin est attendu pour une carte ESP32");
            else e = usb_flash_start_esp(path->valuestring, err, sizeof(err));
        } else {
            snprintf(err, sizeof(err), "type de carte inconnu");
        }
    }
    cJSON_Delete(b);
    if (e == ESP_OK) return http_json_str(r, "{\"ok\":true}");
    return http_error(r, e == ESP_ERR_INVALID_STATE ? 409 : e == ESP_ERR_NOT_FOUND ? 404 : 400, err[0] ? err : esp_err_to_name(e));
}

/* Identification de la carte branchée (ESP32/S3/C3 ou Arduino) ; résultat dans usb.detect. */
static esp_err_t usb_detect_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char err[120] = "";
    esp_err_t e = usb_flash_start_detect(0, err, sizeof(err));
    if (e == ESP_OK) return http_json_str(r, "{\"ok\":true}");
    return http_error(r, e == ESP_ERR_INVALID_STATE ? 409 : 500, err[0] ? err : esp_err_to_name(e));
}

static esp_err_t usb_flash_status_get(httpd_req_t *r)
{
    char v[16];
    uint32_t since = query_get(r, "since", v, sizeof(v)) ? (uint32_t)strtoul(v, NULL, 10) : 0;
    cJSON *j = cJSON_CreateObject();
    if (!j) return http_error(r, 500, "mémoire insuffisante");
    usb_flash_status_json(j, since);
    cJSON *u = cJSON_AddObjectToObject(j, "usb");
    usb_avr_info_json(u);
    return http_json(r, j);
}

static esp_err_t usb_serial_get(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char v[16];
    uint32_t since = query_get(r, "since", v, sizeof(v)) ? (uint32_t)strtoul(v, NULL, 10) : 0;
    char *buf = malloc(4097);
    if (!buf) return http_error(r, 500, "mémoire");
    size_t n = 0;
    uint32_t pos = usb_serial_read(since, buf, 4096, &n);
    buf[n] = 0;
    /* remplace les octets non UTF-8 simples pour que cJSON produise un JSON valide */
    for (size_t i = 0; i < n; i++) if ((unsigned char)buf[i] < 0x09 || buf[i] == 0x0B || buf[i] == 0x0C) buf[i] = '.';
    cJSON *j = cJSON_CreateObject();
    cJSON_AddNumberToObject(j, "pos", pos);
    cJSON_AddStringToObject(j, "data", buf);
    usb_avr_info_json(cJSON_AddObjectToObject(j, "usb"));
    free(buf);
    return http_json(r, j);
}

static esp_err_t usb_serial_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *j = http_body_json(r, 2048);
    if (!j) return http_error(r, 400, "JSON invalide");
    cJSON *baud = cJSON_GetObjectItem(j, "baud");
    cJSON *data = cJSON_GetObjectItem(j, "data");
    esp_err_t e = ESP_OK;
    if (cJSON_IsNumber(baud)) e = usb_serial_set_baud((uint32_t)baud->valuedouble);
    if (e == ESP_OK && cJSON_IsString(data) && data->valuestring[0])
        e = usb_serial_write((const uint8_t *)data->valuestring, strlen(data->valuestring));
    cJSON_Delete(j);
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 409, esp_err_to_name(e));
}

/* ======================= MISES À JOUR / NOTIFICATIONS ======================= */

static esp_err_t update_check_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char out[1280];
    ota_check_now(out, sizeof(out));
    return http_json_str(r, out);
}

static esp_err_t update_approve_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char out[256];
    ota_approve(out, sizeof(out));
    return http_json_str(r, out);
}

static esp_err_t ota_upload_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char msg[160];
    esp_err_t e = ota_upload_handler(r, msg, sizeof(msg));
    if (e != ESP_OK) return http_error(r, 400, msg);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "message", msg);
    return http_json(r, j);
}

static esp_err_t notify_test_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char out[256];
    notifications_test(out, sizeof(out));
    return http_json_str(r, out);
}

/* ======================= CONFIGURATION ======================= */

static esp_err_t admin_config_get(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "ap_ssid", g_lab_cfg.ap_ssid);
    cJSON_AddNumberToObject(j, "ap_channel", g_lab_cfg.ap_channel);
    cJSON_AddStringToObject(j, "sta_ssid", g_lab_cfg.sta_ssid);
    cJSON_AddStringToObject(j, "hostname", g_lab_cfg.hostname);
    cJSON_AddStringToObject(j, "whatsapp_phone", g_lab_cfg.whatsapp_phone);
    cJSON_AddStringToObject(j, "webhook_url", g_lab_cfg.webhook_url);
    cJSON_AddStringToObject(j, "ai_endpoint", g_lab_cfg.ai_endpoint);
    cJSON_AddStringToObject(j, "ai_model", g_lab_cfg.ai_model);
    cJSON_AddStringToObject(j, "search_endpoint", g_lab_cfg.search_endpoint);
    cJSON_AddStringToObject(j, "update_manifest", g_lab_cfg.update_manifest);
    cJSON_AddStringToObject(j, "github_repo", g_lab_cfg.github_repo);
    cJSON_AddStringToObject(j, "ntp_server", g_lab_cfg.ntp_server);
    cJSON_AddStringToObject(j, "timezone", g_lab_cfg.timezone);
    cJSON_AddStringToObject(j, "control_path", g_lab_cfg.control_path);
    cJSON_AddStringToObject(j, "board_variant", g_lab_cfg.board_variant);
    cJSON_AddNumberToObject(j, "rgb_gpio", g_lab_cfg.rgb_gpio);
    cJSON_AddNumberToObject(j, "dht_gpio", g_lab_cfg.dht_gpio);
    cJSON_AddNumberToObject(j, "dht_type", g_lab_cfg.dht_type);
    cJSON_AddBoolToObject(j, "auto_updates", g_lab_cfg.auto_updates);
    cJSON_AddBoolToObject(j, "captive_portal", g_lab_cfg.captive_portal);
    /* Les secrets ne sont jamais renvoyés : seulement leur présence. */
    cJSON_AddBoolToObject(j, "sta_pass_set", g_lab_cfg.sta_pass[0] != 0);
    cJSON_AddBoolToObject(j, "whatsapp_configured", g_lab_cfg.whatsapp_phone[0] && g_lab_cfg.whatsapp_api[0]);
    cJSON_AddBoolToObject(j, "ai_key_set", g_lab_cfg.ai_key[0] != 0);
    return http_json(r, j);
}

static void copy_str(cJSON *obj, const char *key, char *dst, size_t cap, bool keep_if_blank)
{
    cJSON *v = cJSON_GetObjectItem(obj, key);
    if (!cJSON_IsString(v)) return;
    if (keep_if_blank && v->valuestring[0] == 0) return; /* champ secret laissé vide = inchangé */
    strlcpy(dst, v->valuestring, cap);
}

static void restart_task(void *arg)
{
    (void)arg;
    vTaskDelay(pdMS_TO_TICKS(1200));
    esp_restart();
}

static esp_err_t admin_config_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *j = http_body_json(r, 4096);
    if (!j) return http_error(r, 400, "JSON invalide");
    lab_config_t next = g_lab_cfg;
    copy_str(j, "ap_ssid", next.ap_ssid, sizeof(next.ap_ssid), false);
    copy_str(j, "ap_pass", next.ap_pass, sizeof(next.ap_pass), true);
    copy_str(j, "sta_ssid", next.sta_ssid, sizeof(next.sta_ssid), false);
    copy_str(j, "sta_pass", next.sta_pass, sizeof(next.sta_pass), true);
    copy_str(j, "hostname", next.hostname, sizeof(next.hostname), false);
    copy_str(j, "admin_pass", next.admin_pass, sizeof(next.admin_pass), true);
    copy_str(j, "whatsapp_phone", next.whatsapp_phone, sizeof(next.whatsapp_phone), false);
    copy_str(j, "whatsapp_api", next.whatsapp_api, sizeof(next.whatsapp_api), true);
    copy_str(j, "webhook_url", next.webhook_url, sizeof(next.webhook_url), false);
    copy_str(j, "ai_endpoint", next.ai_endpoint, sizeof(next.ai_endpoint), false);
    copy_str(j, "ai_key", next.ai_key, sizeof(next.ai_key), true);
    copy_str(j, "ai_model", next.ai_model, sizeof(next.ai_model), false);
    copy_str(j, "search_endpoint", next.search_endpoint, sizeof(next.search_endpoint), false);
    copy_str(j, "update_manifest", next.update_manifest, sizeof(next.update_manifest), false);
    copy_str(j, "github_repo", next.github_repo, sizeof(next.github_repo), false);
    copy_str(j, "ntp_server", next.ntp_server, sizeof(next.ntp_server), false);
    copy_str(j, "timezone", next.timezone, sizeof(next.timezone), false);
    copy_str(j, "board_variant", next.board_variant, sizeof(next.board_variant), false);
    cJSON *v;
    if (cJSON_IsNumber(v = cJSON_GetObjectItem(j, "ap_channel"))) next.ap_channel = (uint8_t)v->valueint;
    if (cJSON_IsNumber(v = cJSON_GetObjectItem(j, "rgb_gpio"))) next.rgb_gpio = v->valueint;
    if (cJSON_IsNumber(v = cJSON_GetObjectItem(j, "dht_gpio"))) next.dht_gpio = v->valueint;
    if (cJSON_IsNumber(v = cJSON_GetObjectItem(j, "dht_type"))) next.dht_type = (uint8_t)v->valueint;
    if (cJSON_IsBool(v = cJSON_GetObjectItem(j, "auto_updates"))) next.auto_updates = cJSON_IsTrue(v);
    if (cJSON_IsBool(v = cJSON_GetObjectItem(j, "captive_portal"))) next.captive_portal = cJSON_IsTrue(v);
    bool wipe_wa = cJSON_IsTrue(cJSON_GetObjectItem(j, "clear_whatsapp"));
    bool wipe_ai = cJSON_IsTrue(cJSON_GetObjectItem(j, "clear_ai_key"));
    cJSON_Delete(j);
    if (wipe_wa) { next.whatsapp_api[0] = 0; next.whatsapp_phone[0] = 0; }
    if (wipe_ai) next.ai_key[0] = 0;
    const char *err = lab_config_validate(&next);
    if (err) return http_error(r, 400, err);
    bool ap_changed = strcmp(next.ap_ssid, g_lab_cfg.ap_ssid) || strcmp(next.ap_pass, g_lab_cfg.ap_pass);
    if (lab_config_save(&next) != ESP_OK) return http_error(r, 500, "écriture NVS impossible");
    if (ap_changed) worker_pool_push_ap_config(); /* les workers mémorisent le nouveau réseau */
    evlog_add('I', "config", "configuration enregistrée, redémarrage");
    http_json_str(r, "{\"ok\":true,\"restart\":true}");
    xTaskCreate(restart_task, "restart", 2048, NULL, 5, NULL);
    return ESP_OK;
}

/* ======================= DIVERS ======================= */

static esp_err_t agent_chat_post(httpd_req_t *r)
{
    int64_t now = esp_timer_get_time() / 1000;
    if (now - s_agent_last_ms < 1500) return http_error(r, 429, "patientez un instant");
    s_agent_last_ms = now;
    char *b = http_body(r, 1024);
    if (!b) return http_error(r, 400, "question trop longue");
    char q[600] = {0};
    form_get(b, "q", q, sizeof(q));
    free(b);
    char *out = malloc(8192);
    if (!out) return http_error(r, 500, "mémoire");
    agent_chat(q, web_is_admin(r), out, 8192);
    esp_err_t e = http_json_str(r, out);
    free(out);
    return e;
}

static esp_err_t selftest_get(httpd_req_t *r)
{
    const bool mem_ok = esp_get_free_heap_size() > 60000U;
    const bool frag_ok = heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL) > 16000U;
    cJSON *j = cJSON_CreateObject();
    cJSON *checks = cJSON_AddArrayToObject(j, "checks");
#define CHECK(name, ok, detail) do { cJSON *c = cJSON_CreateObject(); cJSON_AddStringToObject(c, "name", name); \
        cJSON_AddBoolToObject(c, "ok", ok); cJSON_AddStringToObject(c, "detail", detail); cJSON_AddItemToArray(checks, c); } while (0)
    char d[96];
    snprintf(d, sizeof(d), "%u octets libres", (unsigned)esp_get_free_heap_size());
    CHECK("Mémoire vive", mem_ok, d);
    snprintf(d, sizeof(d), "plus grand bloc %u octets", (unsigned)heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL));
    CHECK("Fragmentation", frag_ok, d);
    snprintf(d, sizeof(d), "%u Ko", (unsigned)(heap_caps_get_total_size(MALLOC_CAP_SPIRAM) / 1024));
    CHECK("PSRAM", heap_caps_get_total_size(MALLOC_CAP_SPIRAM) > 0, d);
    CHECK("microSD", storage_ready(), storage_ready() ? "montée" : "absente ou non FAT32");
    CHECK("Internet (STA)", wifi_lab_sta_connected(), wifi_lab_sta_connected() ? wifi_lab_sta_ip() : "non configuré ou hors portée");
    CHECK("Heure (NTP)", wifi_lab_time_synced(), wifi_lab_time_synced() ? "synchronisée" : "inconnue");
    float t = telemetry_temp();
    CHECK("Capteur DHT", !isnan(t), isnan(t) ? "pas de mesure" : "mesure valide");
    snprintf(d, sizeof(d), "%u en ligne / %d", (unsigned)worker_pool_online(), WORKER_MAX);
    CHECK("Workers", worker_pool_online() > 0, d);
    CHECK("Portail captif", captive_dns_running(), captive_dns_running() ? "actif" : "désactivé");
    CHECK("USB hôte", true, usb_avr_ready() ? "carte connectée" : "en attente d'une carte");
#undef CHECK
    cJSON_AddBoolToObject(j, "ok", mem_ok && frag_ok);
    return http_json(r, j);
}

static esp_err_t report_snapshot_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char path[120] = {0};
    if (!reports_write_snapshot("manual", path, sizeof(path))) return http_error(r, 503, "microSD absente");
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddStringToObject(j, "path", path);
    return http_json(r, j);
}

static esp_err_t system_reboot_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    evlog_add('W', "system", "redémarrage demandé depuis le dashboard");
    http_json_str(r, "{\"ok\":true}");
    xTaskCreate(restart_task, "restart", 2048, NULL, 5, NULL);
    return ESP_OK;
}

static esp_err_t identify_post(httpd_req_t *r)
{
    led_status_mode("identify");
    return http_json_str(r, "{\"ok\":true}");
}

static esp_err_t wifi_scan_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    esp_err_t e = wifi_lab_scan_start();
    return e == ESP_OK ? http_json_str(r, "{\"ok\":true}") : http_error(r, 409, "scan déjà en cours ou radio occupée");
}

static esp_err_t wifi_scan_get(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *j = cJSON_CreateObject();
    wifi_lab_scan_json(j);
    return http_json(r, j);
}

/* ---------- Veille du labo (matériel de l'utilisateur uniquement, voir veille.h) ---------- */
static esp_err_t veille_get(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    char v[16];
    uint32_t since = query_get(r, "since", v, sizeof(v)) ? (uint32_t)strtoul(v, NULL, 10) : 0;
    cJSON *j = cJSON_CreateObject();
    if (!j) return http_error(r, 500, "mémoire insuffisante");
    veille_status_json(j, since);
    return http_json(r, j);
}

/* {armed:bool} | {mac, name, known:bool} | {rule:{idx?, source, key, op, value, label}} | {delete_rule:idx} */
static esp_err_t veille_post(httpd_req_t *r)
{
    REQUIRE_ADMIN(r);
    cJSON *b = http_body_json(r, 1024);
    if (!b) return http_error(r, 400, "JSON invalide");
    esp_err_t e = ESP_ERR_INVALID_ARG;
    const cJSON *armed = cJSON_GetObjectItem(b, "armed"), *mac = cJSON_GetObjectItem(b, "mac"), *rule = cJSON_GetObjectItem(b, "rule"),
                *del = cJSON_GetObjectItem(b, "delete_rule");
    if (cJSON_IsBool(armed)) {
        e = veille_arm(cJSON_IsTrue(armed));
    } else if (cJSON_IsString(mac)) {
        const cJSON *name = cJSON_GetObjectItem(b, "name"), *known = cJSON_GetObjectItem(b, "known");
        e = veille_set_known(mac->valuestring, cJSON_IsString(name) ? name->valuestring : "", !cJSON_IsFalse(known));
    } else if (cJSON_IsObject(rule)) {
        const cJSON *idx = cJSON_GetObjectItem(rule, "idx"), *src = cJSON_GetObjectItem(rule, "source"), *key = cJSON_GetObjectItem(rule, "key"),
                    *op = cJSON_GetObjectItem(rule, "op"), *val = cJSON_GetObjectItem(rule, "value"), *lab = cJSON_GetObjectItem(rule, "label");
        if (cJSON_IsString(src) && cJSON_IsString(key) && cJSON_IsString(op) && cJSON_IsNumber(val))
            e = veille_set_rule(cJSON_IsNumber(idx) ? idx->valueint : -1, src->valuestring, key->valuestring, op->valuestring[0], (float)val->valuedouble,
                                cJSON_IsString(lab) ? lab->valuestring : "");
    } else if (cJSON_IsNumber(del)) {
        e = veille_del_rule(del->valueint);
    }
    cJSON_Delete(b);
    if (e == ESP_OK) return http_json_str(r, "{\"ok\":true}");
    return http_error(r, e == ESP_ERR_NO_MEM ? 409 : e == ESP_ERR_NOT_FOUND ? 404 : 400,
                      e == ESP_ERR_NO_MEM ? "liste pleine" : e == ESP_ERR_NOT_FOUND ? "règle introuvable" : "requête invalide (adresse MAC AA:BB:CC:DD:EE:FF, opérateur > < =)");
}

static esp_err_t feeds_get(httpd_req_t *r)
{
    cJSON *a = cJSON_CreateArray();
    telemetry_feeds_json(a);
    return http_json(r, a);
}

void web_api_register(httpd_handle_t h)
{
    static const httpd_uri_t routes[] = {
        {.uri = "/api/state", .method = HTTP_GET, .handler = state_get},
        {.uri = "/api/health", .method = HTTP_GET, .handler = health_get},
        {.uri = "/api/system/info", .method = HTTP_GET, .handler = system_info_get},
        {.uri = "/api/system/reboot", .method = HTTP_POST, .handler = system_reboot_post},
        {.uri = "/api/system/identify", .method = HTTP_POST, .handler = identify_post},
        {.uri = "/api/telemetry", .method = HTTP_GET, .handler = telemetry_get},
        {.uri = "/api/feeds", .method = HTTP_GET, .handler = feeds_get},
        {.uri = "/api/veille", .method = HTTP_GET, .handler = veille_get},
        {.uri = "/api/veille", .method = HTTP_POST, .handler = veille_post},
        {.uri = "/api/events", .method = HTTP_GET, .handler = events_get},
        {.uri = "/api/netmon", .method = HTTP_GET, .handler = netmon_get},
        {.uri = "/api/link", .method = HTTP_GET, .handler = linktest_get},
        {.uri = "/api/link/hello", .method = HTTP_GET, .handler = linktest_hello_get},
        {.uri = "/api/netmon/arm", .method = HTTP_POST, .handler = netmon_arm_post},
        {.uri = "/api/selftest", .method = HTTP_GET, .handler = selftest_get},
        {.uri = "/api/report/snapshot", .method = HTTP_POST, .handler = report_snapshot_post},
        {.uri = "/api/jobs", .method = HTTP_GET, .handler = jobs_get},
        {.uri = "/api/job", .method = HTTP_POST, .handler = job_post},
        {.uri = "/api/job/cancel", .method = HTTP_POST, .handler = job_cancel_post},
        {.uri = "/api/jobs/cancel-all", .method = HTTP_POST, .handler = job_cancel_all_post},
        {.uri = "/api/jobs/clear", .method = HTTP_POST, .handler = jobs_clear_post},
        {.uri = "/api/fleet/job", .method = HTTP_POST, .handler = fleet_post},
        {.uri = "/api/fleet/ping", .method = HTTP_POST, .handler = fleet_ping_post},
        {.uri = "/api/fleet/benchmark", .method = HTTP_POST, .handler = fleet_benchmark_post},
        {.uri = "/api/fleet/reboot", .method = HTTP_POST, .handler = fleet_reboot_post},
        {.uri = "/api/worker/info", .method = HTTP_GET, .handler = worker_info_get},
        {.uri = "/api/worker/log", .method = HTTP_GET, .handler = worker_log_get},
        {.uri = "/api/worker/gpio", .method = HTTP_GET, .handler = worker_gpio_get},
        {.uri = "/api/worker/gpio", .method = HTTP_POST, .handler = worker_gpio_post},
        {.uri = "/api/worker/scan", .method = HTTP_GET, .handler = worker_scan_get},
        {.uri = "/api/worker/reboot", .method = HTTP_POST, .handler = worker_reboot_post},
        {.uri = "/api/worker/label", .method = HTTP_POST, .handler = worker_label_post},
        {.uri = "/api/worker/forget", .method = HTTP_POST, .handler = worker_forget_post},
        {.uri = "/api/worker/flash", .method = HTTP_POST, .handler = worker_flash_post},
        {.uri = "/api/worker/flash/remote", .method = HTTP_POST, .handler = worker_flash_remote_post},
        {.uri = "/api/worker/home", .method = HTTP_POST, .handler = worker_home_post},
        {.uri = "/api/worker/discover", .method = HTTP_POST, .handler = worker_discover_post},
        {.uri = "/api/bench/run", .method = HTTP_POST, .handler = bench_run_post},
        {.uri = "/api/bench/status", .method = HTTP_GET, .handler = bench_status_get},
        {.uri = "/api/bench/stop", .method = HTTP_POST, .handler = bench_stop_post},
        {.uri = "/api/fw/*", .method = HTTP_GET, .handler = fw_local_get},
        {.uri = "/api/sd/list", .method = HTTP_GET, .handler = sd_list_get},
        {.uri = "/api/sd/download", .method = HTTP_GET, .handler = sd_download_get},
        {.uri = "/api/sd/upload", .method = HTTP_POST, .handler = sd_upload_post},
        {.uri = "/api/sd/delete", .method = HTTP_POST, .handler = sd_delete_post},
        {.uri = "/api/sd/mkdir", .method = HTTP_POST, .handler = sd_mkdir_post},
        {.uri = "/api/sd/rename", .method = HTTP_POST, .handler = sd_rename_post},
        {.uri = "/api/projects", .method = HTTP_GET, .handler = projects_get},
        {.uri = "/api/project/mkdir", .method = HTTP_POST, .handler = project_mkdir_post},
        {.uri = "/api/project/upload", .method = HTTP_POST, .handler = project_upload_post},
        {.uri = "/api/project/import", .method = HTTP_POST, .handler = project_import_post},
        {.uri = "/api/avr/flash", .method = HTTP_POST, .handler = avr_flash_post},
        {.uri = "/api/usb/flash", .method = HTTP_POST, .handler = usb_flash_post},
        {.uri = "/api/usb/flash/status", .method = HTTP_GET, .handler = usb_flash_status_get},
        {.uri = "/api/usb/detect", .method = HTTP_POST, .handler = usb_detect_post},
        {.uri = "/api/usb/serial", .method = HTTP_GET, .handler = usb_serial_get},
        {.uri = "/api/usb/serial", .method = HTTP_POST, .handler = usb_serial_post},
        {.uri = "/api/update/check", .method = HTTP_POST, .handler = update_check_post},
        {.uri = "/api/update/approve", .method = HTTP_POST, .handler = update_approve_post},
        {.uri = "/api/ota/upload", .method = HTTP_POST, .handler = ota_upload_post},
        {.uri = "/api/notify/test", .method = HTTP_POST, .handler = notify_test_post},
        {.uri = "/api/admin/config", .method = HTTP_GET, .handler = admin_config_get},
        {.uri = "/api/admin/config", .method = HTTP_POST, .handler = admin_config_post},
        {.uri = "/api/agent/chat", .method = HTTP_POST, .handler = agent_chat_post},
        {.uri = "/api/wifi/scan", .method = HTTP_POST, .handler = wifi_scan_post},
        {.uri = "/api/wifi/scan", .method = HTTP_GET, .handler = wifi_scan_get},
    };
    for (size_t i = 0; i < sizeof(routes) / sizeof(routes[0]); ++i) {
        if (httpd_register_uri_handler(h, &routes[i]) != ESP_OK) evlog_add('E', "web", "route non enregistrée : %s", routes[i].uri);
    }
}
