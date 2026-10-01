#include "web_server.h"
#include "lab_config.h"
#include "event_log.h"
#include "http_util.h"
#include "job_engine.h"
#include "storage.h"
#include "telemetry.h"
#include "usb_avr.h"
#include "wifi_lab.h"
#include "worker_pool.h"
#include "cJSON.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "esp_random.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *TAG = "web";
static httpd_handle_t s_server = NULL;

/* ---------- ressources web embarquées (compressées gzip au build) ---------- */
extern const uint8_t index_html_gz_start[] asm("_binary_index_html_gz_start");
extern const uint8_t index_html_gz_end[] asm("_binary_index_html_gz_end");
extern const uint8_t catalog_js_gz_start[] asm("_binary_catalog_js_gz_start");
extern const uint8_t catalog_js_gz_end[] asm("_binary_catalog_js_gz_end");
extern const uint8_t app_js_gz_start[] asm("_binary_app_js_gz_start");
extern const uint8_t app_js_gz_end[] asm("_binary_app_js_gz_end");
extern const uint8_t app_css_gz_start[] asm("_binary_app_css_gz_start");
extern const uint8_t app_css_gz_end[] asm("_binary_app_css_gz_end");

/* ---------- sessions administrateur ---------- */
typedef struct {
    char token[33];
    int64_t expires_ms;
} session_t;

static session_t s_sessions[SESSION_MAX];
static SemaphoreHandle_t s_sess_mx = NULL;
static int s_login_failures = 0;
static int64_t s_login_locked_until = 0;

static int64_t now_ms(void) { return esp_timer_get_time() / 1000; }

httpd_handle_t web_server_handle(void) { return s_server; }

bool web_is_admin(httpd_req_t *r)
{
    char tok[40] = {0};
    size_t len = sizeof(tok);
    if (httpd_req_get_cookie_val(r, "LABSESS", tok, &len) != ESP_OK || strlen(tok) != 32) return false;
    bool ok = false;
    int64_t t = now_ms();
    xSemaphoreTake(s_sess_mx, portMAX_DELAY);
    for (int i = 0; i < SESSION_MAX; i++) {
        if (s_sessions[i].token[0] && s_sessions[i].expires_ms > t && strcmp(s_sessions[i].token, tok) == 0) {
            s_sessions[i].expires_ms = t + WEB_SESSION_MS; /* expiration glissante */
            ok = true;
            break;
        }
    }
    xSemaphoreGive(s_sess_mx);
    return ok;
}

static void new_session(char out[33])
{
    uint8_t rnd[16];
    esp_fill_random(rnd, sizeof(rnd));
    for (int i = 0; i < 16; i++) snprintf(out + i * 2, 3, "%02x", rnd[i]);
    int64_t t = now_ms();
    xSemaphoreTake(s_sess_mx, portMAX_DELAY);
    int slot = 0;
    for (int i = 0; i < SESSION_MAX; i++) {
        if (!s_sessions[i].token[0] || s_sessions[i].expires_ms < t) { slot = i; break; }
        if (s_sessions[i].expires_ms < s_sessions[slot].expires_ms) slot = i;
    }
    strlcpy(s_sessions[slot].token, out, sizeof(s_sessions[slot].token));
    s_sessions[slot].expires_ms = t + WEB_SESSION_MS;
    xSemaphoreGive(s_sess_mx);
}

static void drop_session(httpd_req_t *r)
{
    char tok[40] = {0};
    size_t len = sizeof(tok);
    if (httpd_req_get_cookie_val(r, "LABSESS", tok, &len) != ESP_OK) return;
    xSemaphoreTake(s_sess_mx, portMAX_DELAY);
    for (int i = 0; i < SESSION_MAX; i++)
        if (!strcmp(s_sessions[i].token, tok)) memset(&s_sessions[i], 0, sizeof(session_t));
    xSemaphoreGive(s_sess_mx);
}

/* Comparaison à temps constant (évite de deviner le mot de passe par le temps de réponse). */
static bool secure_equals(const char *a, const char *b)
{
    size_t la = strlen(a), lb = strlen(b);
    unsigned char d = (unsigned char)(la ^ lb);
    for (size_t i = 0; i < la && i < 128; i++) d |= (unsigned char)(a[i] ^ b[i % (lb ? lb : 1)]);
    return d == 0 && la == lb;
}

/* ---------- pages ---------- */

static esp_err_t send_gz(httpd_req_t *r, const char *type, const uint8_t *start, const uint8_t *end, const char *cache)
{
    httpd_resp_set_type(r, type);
    httpd_resp_set_hdr(r, "Content-Encoding", "gzip");
    httpd_resp_set_hdr(r, "Cache-Control", cache);
    httpd_resp_set_hdr(r, "X-Content-Type-Options", "nosniff");
    return httpd_resp_send(r, (const char *)start, end - start);
}

static esp_err_t index_get(httpd_req_t *r)
{
    return send_gz(r, "text/html; charset=utf-8", index_html_gz_start, index_html_gz_end, "no-cache");
}

static esp_err_t catalog_get(httpd_req_t *r)
{
    return send_gz(r, "application/javascript; charset=utf-8", catalog_js_gz_start, catalog_js_gz_end,
                   "public, max-age=3600");
}

/* app.js / app.css changent à chaque version du firmware : revalidation (no-cache) plutôt qu'un cache long,
 * pour qu'une mise à jour OTA soit visible immédiatement. Le catalogue, plus lourd, garde un cache d'une heure. */
static esp_err_t app_js_get(httpd_req_t *r)
{
    return send_gz(r, "application/javascript; charset=utf-8", app_js_gz_start, app_js_gz_end, "no-cache");
}

static esp_err_t app_css_get(httpd_req_t *r)
{
    return send_gz(r, "text/css; charset=utf-8", app_css_gz_start, app_css_gz_end, "no-cache");
}

static const char LOGIN_PAGE[] =
    "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<title>ESP32 LAB · Accès administrateur</title><style>"
    ":root{color-scheme:light dark;--bg:#f4f5f7;--card:#fff;--txt:#14171c;--mut:#667085;--line:#e3e6ea;--acc:#1f6feb}"
    "@media(prefers-color-scheme:dark){:root{--bg:#0e1116;--card:#161a21;--txt:#e8ebf0;--mut:#8b93a1;--line:#262c36;--acc:#4c8dff}}"
    "*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--txt);"
    "font:15px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:16px}"
    "form{width:100%;max-width:360px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px}"
    "h1{font-size:18px;margin:0 0 4px}p{color:var(--mut);margin:0 0 20px;font-size:13px}"
    "label{font-size:12px;font-weight:600;color:var(--mut)}input{width:100%;margin:6px 0 16px;padding:11px 12px;border-radius:9px;"
    "border:1px solid var(--line);background:transparent;color:inherit;font:inherit}"
    "button{width:100%;padding:11px;border:0;border-radius:9px;background:var(--acc);color:#fff;font-weight:600;font:inherit;cursor:pointer}"
    ".err{color:#d92d20;font-size:13px;margin:-8px 0 12px}</style></head><body>"
    "<form method='POST'><h1>ESP32 LAB</h1><p>Accès administrateur</p>%ERR%"
    "<label for='p'>Mot de passe</label><input id='p' name='password' type='password' autocomplete='current-password' required autofocus>"
    "<button>Se connecter</button></form></body></html>";

static esp_err_t send_login(httpd_req_t *r, const char *err)
{
    httpd_resp_set_type(r, "text/html; charset=utf-8");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    const char *mark = strstr(LOGIN_PAGE, "%ERR%");
    httpd_resp_send_chunk(r, LOGIN_PAGE, mark - LOGIN_PAGE);
    if (err) {
        httpd_resp_sendstr_chunk(r, "<div class='err'>");
        httpd_resp_sendstr_chunk(r, err);
        httpd_resp_sendstr_chunk(r, "</div>");
    }
    httpd_resp_sendstr_chunk(r, mark + 5);
    return httpd_resp_send_chunk(r, NULL, 0);
}

static esp_err_t control_get(httpd_req_t *r)
{
    if (web_is_admin(r)) {
        httpd_resp_set_status(r, "303 See Other");
        httpd_resp_set_hdr(r, "Location", "/#admin");
        return httpd_resp_send(r, "", 0);
    }
    return send_login(r, NULL);
}

static esp_err_t control_post(httpd_req_t *r)
{
    int64_t t = now_ms();
    if (t < s_login_locked_until) {
        httpd_resp_set_status(r, "429 Too Many Requests");
        return send_login(r, "Trop d'essais. Réessayez dans une minute.");
    }
    char *b = http_body(r, 512);
    char pw[100] = {0};
    if (b) { form_get(b, "password", pw, sizeof(pw)); free(b); }
    if (!pw[0] || !secure_equals(pw, g_lab_cfg.admin_pass)) {
        if (++s_login_failures >= 5) {
            s_login_locked_until = t + 60000;
            s_login_failures = 0;
            evlog_add('W', "auth", "5 échecs de connexion admin : verrouillage 60 s");
        }
        vTaskDelay(pdMS_TO_TICKS(600));
        httpd_resp_set_status(r, "403 Forbidden");
        return send_login(r, "Mot de passe incorrect.");
    }
    s_login_failures = 0;
    char tok[33];
    new_session(tok);
    char h[120];
    snprintf(h, sizeof(h), "LABSESS=%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%lu", tok,
             (unsigned long)(WEB_SESSION_MS / 1000));
    httpd_resp_set_hdr(r, "Set-Cookie", h);
    httpd_resp_set_status(r, "303 See Other");
    httpd_resp_set_hdr(r, "Location", "/#admin");
    evlog_add('I', "auth", "connexion administrateur");
    return httpd_resp_send(r, "", 0);
}

static esp_err_t logout_post(httpd_req_t *r)
{
    drop_session(r);
    httpd_resp_set_hdr(r, "Set-Cookie", "LABSESS=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
    return http_json_str(r, "{\"ok\":true}");
}

static esp_err_t session_get(httpd_req_t *r)
{
    cJSON *j = cJSON_CreateObject();
    cJSON_AddBoolToObject(j, "admin", web_is_admin(r));
    cJSON_AddStringToObject(j, "version", LAB_VERSION);
    return http_json(r, j);
}

/* Portail captif : toute URL inconnue (hors /api) renvoie vers le dashboard. */
static esp_err_t not_found(httpd_req_t *r, httpd_err_code_t err)
{
    (void)err;
    if (strncmp(r->uri, "/api/", 5) == 0) return http_error(r, 404, "route inconnue");
    httpd_resp_set_status(r, "302 Found");
    httpd_resp_set_hdr(r, "Location", "http://" AP_IP_STR "/");
    httpd_resp_set_hdr(r, "Cache-Control", "no-store");
    return httpd_resp_send(r, "", 0);
}

static esp_err_t manifest_get(httpd_req_t *r)
{
    static const char m[] =
        "{\"name\":\"ESP32 LAB\",\"short_name\":\"ESP32 LAB\",\"start_url\":\"/\",\"display\":\"standalone\","
        "\"background_color\":\"#0e1116\",\"theme_color\":\"#0e1116\","
        "\"icons\":[{\"src\":\"/icon.svg\",\"sizes\":\"any\",\"type\":\"image/svg+xml\"}]}";
    httpd_resp_set_type(r, "application/manifest+json");
    return httpd_resp_send(r, m, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t icon_get(httpd_req_t *r)
{
    static const char svg[] =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#0e1116'/>"
        "<rect x='18' y='18' width='28' height='28' rx='4' fill='none' stroke='#4c8dff' stroke-width='4'/>"
        "<path d='M24 10v8M32 10v8M40 10v8M24 46v8M32 46v8M40 46v8M10 24h8M10 32h8M10 40h8M46 24h8M46 32h8M46 40h8' "
        "stroke='#4c8dff' stroke-width='3' stroke-linecap='round'/><circle cx='32' cy='32' r='5' fill='#34d399'/></svg>";
    httpd_resp_set_type(r, "image/svg+xml");
    httpd_resp_set_hdr(r, "Cache-Control", "public, max-age=604800");
    return httpd_resp_send(r, svg, HTTPD_RESP_USE_STRLEN);
}

/* ---------- WebSocket : état poussé toutes les 2 s ---------- */

static esp_err_t ws_handler(httpd_req_t *r)
{
    if (r->method == HTTP_GET) return ESP_OK; /* poignée de main */
    httpd_ws_frame_t f = {0};
    if (httpd_ws_recv_frame(r, &f, 0) != ESP_OK) return ESP_FAIL;
    if (f.len == 0 || f.len > 512) return ESP_OK;
    uint8_t *p = malloc(f.len + 1);
    if (!p) return ESP_ERR_NO_MEM;
    f.payload = p;
    esp_err_t e = httpd_ws_recv_frame(r, &f, f.len);
    free(p); /* les messages entrants (ping applicatif) sont ignorés */
    return e;
}

cJSON *web_state_json(bool detailed); /* web_api.c */

static uint32_t s_ws_last_evt = 0;

static void ws_work(void *arg)
{
    (void)arg;
    httpd_handle_t h = s_server;
    if (!h) return;
    size_t cap = 12;
    int fds[12];
    if (httpd_get_client_list(h, &cap, fds) != ESP_OK) return;
    bool any = false;
    for (size_t i = 0; i < cap; i++) if (httpd_ws_get_fd_info(h, fds[i]) == HTTPD_WS_CLIENT_WEBSOCKET) any = true;
    if (!any) { s_ws_last_evt = evlog_last_seq(); return; }
    cJSON *root = web_state_json(false);
    if (!root) return;
    cJSON *ev = cJSON_AddArrayToObject(root, "events");
    evlog_to_json(ev, s_ws_last_evt, 20);
    s_ws_last_evt = evlog_last_seq();
    char *s = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    if (!s) return;
    httpd_ws_frame_t fr = {.type = HTTPD_WS_TYPE_TEXT, .payload = (uint8_t *)s, .len = strlen(s), .final = true};
    for (size_t i = 0; i < cap; i++)
        if (httpd_ws_get_fd_info(h, fds[i]) == HTTPD_WS_CLIENT_WEBSOCKET) httpd_ws_send_frame_async(h, fds[i], &fr);
    free(s);
}

static void ws_task(void *arg)
{
    (void)arg;
    for (;;) {
        if (s_server) httpd_queue_work(s_server, ws_work, NULL);
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}

void web_server_start(void)
{
    s_sess_mx = xSemaphoreCreateMutex();
    httpd_config_t c = HTTPD_DEFAULT_CONFIG();
    c.server_port = HTTP_PORT;
    c.max_open_sockets = 12;
    c.max_uri_handlers = 100;
    c.stack_size = 16384;
    c.lru_purge_enable = true;
    c.recv_wait_timeout = 10;
    c.send_wait_timeout = 10;
    c.uri_match_fn = httpd_uri_match_wildcard;
    if (httpd_start(&s_server, &c) != ESP_OK) {
        ESP_LOGE(TAG, "serveur HTTP impossible à démarrer");
        evlog_add('E', "web", "serveur HTTP impossible à démarrer");
        return;
    }
#define REG(path, m, fn) do { httpd_uri_t z = {.uri = (path), .method = (m), .handler = (fn)}; \
        if (httpd_register_uri_handler(s_server, &z) != ESP_OK) ESP_LOGE(TAG, "route %s", (path)); } while (0)
    REG("/", HTTP_GET, index_get);
    REG("/index.html", HTTP_GET, index_get);
    REG("/catalog.js", HTTP_GET, catalog_get);
    REG("/app.js", HTTP_GET, app_js_get);
    REG("/app.css", HTTP_GET, app_css_get);
    REG("/manifest.webmanifest", HTTP_GET, manifest_get);
    REG("/icon.svg", HTTP_GET, icon_get);
    REG("/favicon.ico", HTTP_GET, icon_get);
    REG("/api/session", HTTP_GET, session_get);
    REG("/api/logout", HTTP_POST, logout_post);
    REG(g_lab_cfg.control_path, HTTP_GET, control_get);
    REG(g_lab_cfg.control_path, HTTP_POST, control_post);
#undef REG
    httpd_uri_t ws = {.uri = "/ws", .method = HTTP_GET, .handler = ws_handler, .is_websocket = true};
    httpd_register_uri_handler(s_server, &ws);
    web_api_register(s_server);
    httpd_register_err_handler(s_server, HTTPD_404_NOT_FOUND, not_found);
    xTaskCreate(ws_task, "ws_push", 3072, NULL, 3, NULL);
    ESP_LOGI(TAG, "serveur web prêt sur le port %d", HTTP_PORT);
}
