#pragma once
#include "cJSON.h"
#include "esp_http_server.h"

/* Tests réguliers de la liaison Wi-Fi S3 ↔ Pi.
 * Le Pi s'annonce toutes les 30 s (GET /api/link/hello?port=8088) ; le S3 retient son adresse et le sonde toutes les
 * 20 s (3 × GET /api/v1/ping) : latence, gigue, perte, liaison tombée ou rétablie (journal d'événements). */
void linktest_start(void);
esp_err_t linktest_hello_get(httpd_req_t *r);
esp_err_t linktest_get(httpd_req_t *r);
/* Résumé pour /api/state : {pi, ok, rtt_ms, loss_pct}. */
void linktest_summary_json(cJSON *obj);
