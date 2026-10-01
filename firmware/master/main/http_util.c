#include "http_util.h"
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

esp_err_t http_json_str(httpd_req_t *r, const char *json)
{
    httpd_resp_set_type(r, "application/json; charset=utf-8");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    return httpd_resp_send(r, json ? json : "{}", HTTPD_RESP_USE_STRLEN);
}

esp_err_t http_json(httpd_req_t *r, cJSON *j)
{
    if (!j) return http_error(r, 500, "mémoire insuffisante");
    char *s = cJSON_PrintUnformatted(j);
    cJSON_Delete(j);
    if (!s) return http_error(r, 500, "mémoire insuffisante");
    esp_err_t e = http_json_str(r, s);
    free(s);
    return e;
}

static const char *status_line(int status)
{
    switch (status) {
    case 400: return "400 Bad Request";
    case 401: return "401 Unauthorized";
    case 403: return "403 Forbidden";
    case 404: return "404 Not Found";
    case 409: return "409 Conflict";
    case 413: return "413 Payload Too Large";
    case 429: return "429 Too Many Requests";
    case 503: return "503 Service Unavailable";
    default: return "500 Internal Server Error";
    }
}

esp_err_t http_error(httpd_req_t *r, int status, const char *msg)
{
    cJSON *j = cJSON_CreateObject();
    httpd_resp_set_status(r, status_line(status));
    if (!j) return httpd_resp_send(r, "{\"ok\":false}", HTTPD_RESP_USE_STRLEN);
    cJSON_AddBoolToObject(j, "ok", false);
    cJSON_AddStringToObject(j, "error", msg ? msg : "erreur");
    return http_json(r, j);
}

char *http_body(httpd_req_t *r, size_t max)
{
    if (!r || r->content_len > max) return NULL;
    size_t len = r->content_len;
    char *b = malloc(len + 1);
    if (!b) return NULL;
    size_t pos = 0;
    int timeouts = 0;
    while (pos < len) {
        int n = httpd_req_recv(r, b + pos, len - pos);
        if (n == HTTPD_SOCK_ERR_TIMEOUT && ++timeouts < 3) continue;
        if (n <= 0) { free(b); return NULL; }
        pos += (size_t)n;
    }
    b[pos] = 0;
    return b;
}

cJSON *http_body_json(httpd_req_t *r, size_t max)
{
    char *b = http_body(r, max);
    if (!b) return NULL;
    cJSON *j = cJSON_Parse(b);
    free(b);
    return j;
}

void url_decode_inplace(char *s)
{
    char *o = s;
    while (s && *s) {
        if (*s == '+') { *o++ = ' '; s++; }
        else if (*s == '%' && isxdigit((unsigned char)s[1]) && isxdigit((unsigned char)s[2])) {
            char h[3] = {s[1], s[2], 0};
            *o++ = (char)strtol(h, NULL, 16);
            s += 3;
        } else *o++ = *s++;
    }
    if (o) *o = 0;
}

bool form_get(const char *src, const char *key, char *out, size_t cap)
{
    if (!src || !key || !out || cap == 0) return false;
    size_t kl = strlen(key);
    const char *p = src;
    while (p && *p) {
        if (strncmp(p, key, kl) == 0 && p[kl] == '=') {
            p += kl + 1;
            size_t i = 0;
            while (*p && *p != '&' && i + 1 < cap) out[i++] = *p++;
            out[i] = 0;
            url_decode_inplace(out);
            return true;
        }
        p = strchr(p, '&');
        if (p) p++;
    }
    out[0] = 0;
    return false;
}

bool query_get(httpd_req_t *r, const char *key, char *out, size_t cap)
{
    if (!out || cap == 0) return false;
    out[0] = 0;
    size_t ql = httpd_req_get_url_query_len(r);
    if (ql == 0 || ql > 600) return false;
    char *q = malloc(ql + 1);
    if (!q) return false;
    bool ok = httpd_req_get_url_query_str(r, q, ql + 1) == ESP_OK && httpd_query_key_value(q, key, out, cap) == ESP_OK;
    free(q);
    if (ok) url_decode_inplace(out);
    else out[0] = 0;
    return ok;
}
