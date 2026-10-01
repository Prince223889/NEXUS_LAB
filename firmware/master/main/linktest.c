#include "linktest.h"
#include "event_log.h"
#include "http_util.h"
#include "esp_http_client.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "lwip/inet.h"
#include "lwip/sockets.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define LT_HIST 90             /* 90 sondes = 30 cycles de 3 sondes ≈ 10 min */
#define LT_PERIOD_MS 20000
#define LT_PROBES 3
#define LT_TIMEOUT_MS 1500
#define LT_FORGET_US (10LL * 60 * 1000000)   /* Pi oublié s'il ne s'annonce plus depuis 10 min */

static SemaphoreHandle_t s_mx;
static uint32_t s_ip;          /* adresse IPv4 du Pi (ordre réseau), 0 = inconnu */
static uint16_t s_port = 8088;
static int64_t s_hello_us, s_last_ok_us;
static int16_t s_hist[LT_HIST]; /* latence en ms, -1 = perdue */
static uint32_t s_hist_n, s_sent, s_lost;
static bool s_up;

static void record(int ms)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    s_hist[s_hist_n % LT_HIST] = (int16_t)(ms < 0 ? -1 : (ms > 30000 ? 30000 : ms));
    s_hist_n++;
    s_sent++;
    if (ms < 0) s_lost++;
    else s_last_ok_us = esp_timer_get_time();
    xSemaphoreGive(s_mx);
}

/* Statistiques sur l'anneau : moyenne, min, max, gigue (écart moyen entre sondes successives), perte. */
static void stats(int *avg, int *mn, int *mx, int *jit, int *loss, int *n_out)
{
    int n = s_hist_n < LT_HIST ? (int)s_hist_n : LT_HIST, ok = 0, lost = 0, sum = 0, jsum = 0, jn = 0, prev = -1;
    *mn = 0; *mx = 0;
    for (int i = 0; i < n; ++i) {
        int v = s_hist[(s_hist_n - n + i) % LT_HIST];
        if (v < 0) { lost++; prev = -1; continue; }
        if (!ok || v < *mn) *mn = v;
        if (v > *mx) *mx = v;
        sum += v; ok++;
        if (prev >= 0) { jsum += abs(v - prev); jn++; }
        prev = v;
    }
    *avg = ok ? sum / ok : 0;
    *jit = jn ? jsum / jn : 0;
    *loss = n ? (lost * 100) / n : 0;
    *n_out = n;
}

static int probe(const char *url)
{
    esp_http_client_config_t cfg = {.url = url, .method = HTTP_METHOD_GET, .timeout_ms = LT_TIMEOUT_MS, .buffer_size = 512, .disable_auto_redirect = true};
    esp_http_client_handle_t h = esp_http_client_init(&cfg);
    if (!h) return -1;
    int64_t t0 = esp_timer_get_time();
    esp_err_t e = esp_http_client_perform(h);
    int code = esp_http_client_get_status_code(h);
    int64_t t1 = esp_timer_get_time();
    esp_http_client_cleanup(h);
    return (e == ESP_OK && code == 200) ? (int)((t1 - t0) / 1000) : -1;
}

static void link_task(void *arg)
{
    (void)arg;
    char url[64];
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(LT_PERIOD_MS));
        xSemaphoreTake(s_mx, portMAX_DELAY);
        uint32_t ip = s_ip;
        uint16_t port = s_port;
        bool stale = ip && esp_timer_get_time() - s_hello_us > LT_FORGET_US;
        if (stale) s_ip = 0;
        xSemaphoreGive(s_mx);
        if (stale) { evlog_add('W', "liaison", "Pi silencieux depuis 10 min : sondes suspendues"); s_up = false; continue; }
        if (!ip) continue;
        struct in_addr a = {.s_addr = ip};
        snprintf(url, sizeof(url), "http://%s:%u/api/v1/ping", inet_ntoa(a), port);
        int ok = 0;
        for (int i = 0; i < LT_PROBES; ++i) {
            int ms = probe(url);
            record(ms);
            if (ms >= 0) ok++;
            vTaskDelay(pdMS_TO_TICKS(150));
        }
        if (ok && !s_up) { s_up = true; evlog_add('I', "liaison", "Liaison S3 ↔ Pi établie (%s)", inet_ntoa(a)); }
        else if (!ok && s_up) { s_up = false; evlog_add('W', "liaison", "Liaison S3 ↔ Pi perdue (%s) : 3 sondes sans réponse", inet_ntoa(a)); }
    }
}

void linktest_start(void)
{
    s_mx = xSemaphoreCreateMutex();
    xTaskCreate(link_task, "linktest", 4096, NULL, 2, NULL);
}

/* Adresse IPv4 du client (y compris IPv4 transportée en IPv6). */
static uint32_t peer_ipv4(httpd_req_t *r)
{
    int fd = httpd_req_to_sockfd(r);
    struct sockaddr_storage ss;
    socklen_t len = sizeof(ss);
    if (fd < 0 || getpeername(fd, (struct sockaddr *)&ss, &len) != 0) return 0;
    if (ss.ss_family == AF_INET) return ((struct sockaddr_in *)&ss)->sin_addr.s_addr;
#if LWIP_IPV6
    if (ss.ss_family == AF_INET6) {
        const uint8_t *b = ((struct sockaddr_in6 *)&ss)->sin6_addr.s6_addr;
        uint32_t v;
        memcpy(&v, b + 12, 4);
        return v;
    }
#endif
    return 0;
}

esp_err_t linktest_hello_get(httpd_req_t *r)
{
    uint32_t ip = peer_ipv4(r);
    const uint8_t *o = (const uint8_t *)&ip;
    /* Seul un client du point d'accès du labo (192.168.4.2-254) peut se déclarer Pi. */
    if (!(o[0] == 192 && o[1] == 168 && o[2] == 4 && o[3] >= 2 && o[3] <= 254)) return http_error(r, 403, "réservé au Pi du point d'accès du labo");
    char p[8] = "";
    long port = 8088;
    if (query_get(r, "port", p, sizeof(p))) port = strtol(p, NULL, 10);
    if (port < 1 || port > 65535) return http_error(r, 400, "port invalide");
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool changed = s_ip != ip;
    s_ip = ip;
    s_port = (uint16_t)port;
    s_hello_us = esp_timer_get_time();
    xSemaphoreGive(s_mx);
    if (changed) {
        struct in_addr a = {.s_addr = ip};
        evlog_add('I', "liaison", "Pi annoncé : %s:%ld", inet_ntoa(a), port);
    }
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "ok", true);
    cJSON_AddNumberToObject(j, "period_s", LT_PERIOD_MS / 1000);
    return http_json(r, j);
}

static void fill(cJSON *j, bool history)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    int avg, mn, mx, jit, loss, n;
    stats(&avg, &mn, &mx, &jit, &loss, &n);
    int64_t now = esp_timer_get_time();
    if (s_ip) {
        struct in_addr a = {.s_addr = s_ip};
        char buf[24];
        snprintf(buf, sizeof(buf), "%s:%u", inet_ntoa(a), s_port);
        cJSON_AddStringToObject(j, "pi", buf);
    } else {
        cJSON_AddNullToObject(j, "pi");
    }
    cJSON_AddBoolToObject(j, "ok", s_ip && s_up);
    cJSON_AddNumberToObject(j, "rtt_ms", avg);
    cJSON_AddNumberToObject(j, "loss_pct", loss);
    if (history) {
        cJSON_AddNumberToObject(j, "min_ms", mn);
        cJSON_AddNumberToObject(j, "max_ms", mx);
        cJSON_AddNumberToObject(j, "jitter_ms", jit);
        cJSON_AddNumberToObject(j, "samples", n);
        cJSON_AddNumberToObject(j, "sent", s_sent);
        cJSON_AddNumberToObject(j, "lost", s_lost);
        cJSON_AddNumberToObject(j, "period_s", LT_PERIOD_MS / 1000);
        cJSON_AddNumberToObject(j, "hello_age_s", s_hello_us ? (double)((now - s_hello_us) / 1000000) : -1);
        cJSON_AddNumberToObject(j, "last_ok_age_s", s_last_ok_us ? (double)((now - s_last_ok_us) / 1000000) : -1);
        cJSON *h = cJSON_AddArrayToObject(j, "history");
        for (int i = 0; i < n; ++i) cJSON_AddItemToArray(h, cJSON_CreateNumber(s_hist[(s_hist_n - n + i) % LT_HIST]));
    }
    xSemaphoreGive(s_mx);
}

esp_err_t linktest_get(httpd_req_t *r)
{
    cJSON *j = cJSON_CreateObject();
    fill(j, true);
    return http_json(r, j);
}

void linktest_summary_json(cJSON *obj)
{
    if (s_mx) fill(obj, false);
}
