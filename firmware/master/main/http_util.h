#pragma once
#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"
#include "esp_http_server.h"
#include "cJSON.h"

/* Envoie `j` en JSON puis le libère. */
esp_err_t http_json(httpd_req_t *r, cJSON *j);
esp_err_t http_json_str(httpd_req_t *r, const char *json);
/* Réponse d'erreur JSON {ok:false,error:"..."} avec le statut HTTP donné (400, 401, 404, 409, 429, 500…). */
esp_err_t http_error(httpd_req_t *r, int status, const char *msg);
/* Lit le corps (max `max` octets) dans un tampon alloué et terminé par 0 ; NULL si trop gros ou erreur. */
char *http_body(httpd_req_t *r, size_t max);
cJSON *http_body_json(httpd_req_t *r, size_t max);
/* Paramètre de formulaire x-www-form-urlencoded, décodé. */
bool form_get(const char *body, const char *key, char *out, size_t cap);
/* Paramètre d'URL (?clé=valeur), décodé. */
bool query_get(httpd_req_t *r, const char *key, char *out, size_t cap);
void url_decode_inplace(char *s);
