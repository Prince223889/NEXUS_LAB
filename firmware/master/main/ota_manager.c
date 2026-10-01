#include "ota_manager.h"
#include "lab_config.h"
#include "event_log.h"
#include "led_status.h"
#include "notifications.h"
#include "storage.h"
#include "wifi_lab.h"
#include "esp_app_desc.h"
#include "esp_crt_bundle.h"
#include "esp_heap_caps.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "psa/crypto.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

static const char *TAG = "ota";
static char token_s[17], path_s[240];
static int64_t token_expiry_ms = 0;
static char new_url[256], new_sha[65], new_ver[32], new_notes[256];
static size_t new_size = 0; /* taille publiée par GitHub (0 pour un manifeste) */
static char new_assets[512];  /* autres .bin de la Release (worker…) : "nom|url;…" pour l'interface */
static bool new_from_github = false;
static volatile bool available = false, approved = false, s_busy = false;
static int64_t last_notify_ms = 0;

bool ota_busy(void) { return s_busy || approved; }

void ota_register_local_file(const char *t, const char *p)
{
    if (!t || !p) return;
    strlcpy(token_s, t, sizeof(token_s));
    strlcpy(path_s, p, sizeof(path_s));
    token_expiry_ms = esp_timer_get_time() / 1000 + 5LL * 60LL * 1000LL;
}

const char *ota_local_path_for_token(const char *t)
{
    return (t && token_s[0] && strcmp(t, token_s) == 0 && (esp_timer_get_time() / 1000) < token_expiry_ms) ? path_s : NULL;
}

void ota_info_json(cJSON *obj)
{
    if (!obj) return;
    const esp_partition_t *run = esp_ota_get_running_partition();
    const esp_partition_t *next = esp_ota_get_next_update_partition(NULL);
    const esp_app_desc_t *d = esp_app_get_description();
    cJSON_AddStringToObject(obj, "running", run ? run->label : "?");
    cJSON_AddStringToObject(obj, "next", next ? next->label : "?");
    cJSON_AddNumberToObject(obj, "slot_size", next ? next->size : 0);
    cJSON_AddStringToObject(obj, "app_version", d->version);
    cJSON_AddStringToObject(obj, "build_date", d->date);
    cJSON_AddStringToObject(obj, "build_time", d->time);
    cJSON_AddStringToObject(obj, "idf", d->idf_ver);
    cJSON_AddBoolToObject(obj, "update_available", available);
    if (available) {
        cJSON_AddStringToObject(obj, "update_version", new_ver);
        cJSON_AddStringToObject(obj, "update_notes", new_notes);
        cJSON_AddStringToObject(obj, "update_source", new_from_github ? "github" : "manifest");
    }
    cJSON_AddBoolToObject(obj, "busy", ota_busy());
}

static bool read_text_https(const char *url, char *out, size_t cap)
{
    esp_http_client_config_t cfg = {.url = url, .timeout_ms = 15000, .crt_bundle_attach = esp_crt_bundle_attach,
                                    .max_redirection_count = 5, .user_agent = "ESP32-LAB"};
    esp_http_client_handle_t h = esp_http_client_init(&cfg);
    if (h) esp_http_client_set_header(h, "Accept", "application/vnd.github+json");
    if (!h) return false;
    bool ok = false;
    if (esp_http_client_open(h, 0) == ESP_OK) {
        int content_len = esp_http_client_fetch_headers(h);
        int code = esp_http_client_get_status_code(h);
        if (code == 200 && !(content_len > 0 && (size_t)content_len >= cap)) {
            size_t used = 0;
            ok = true;
            while (used + 1 < cap) {
                int n = esp_http_client_read(h, out + used, (int)(cap - used - 1));
                if (n < 0) { ok = false; break; }
                if (n == 0) break;
                used += (size_t)n;
            }
            out[used] = 0;
        }
    }
    esp_http_client_close(h);
    esp_http_client_cleanup(h);
    return ok;
}

static int vercmp(const char *a, const char *b)
{
    int x1 = 0, y1 = 0, z1 = 0, x2 = 0, y2 = 0, z2 = 0;
    if (!a || !b) return -1;
    sscanf(a, "%d.%d.%d", &x1, &y1, &z1);
    sscanf(b, "%d.%d.%d", &x2, &y2, &z2);
    if (x1 != x2) return x1 > x2 ? 1 : -1;
    if (y1 != y2) return y1 > y2 ? 1 : -1;
    if (z1 != z2) return z1 > z2 ? 1 : -1;
    return 0;
}

static bool hex64(const char *s)
{
    if (!s || strlen(s) != 64) return false;
    for (int i = 0; i < 64; i++) {
        char c = s[i];
        if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) return false;
    }
    return true;
}

/* Un asset de Release correspond-il au MASTER ? (esp32_lab_master*.bin, master*.bin, *master*.bin) */
static bool is_master_asset(const char *name)
{
    size_t n = strlen(name);
    if (n < 5 || strcasecmp(name + n - 4, ".bin") != 0) return false;
    return strcasestr(name, "master") != NULL;
}

/* Mise à jour par GitHub Releases : https://api.github.com/repos/<repo>/releases/latest.
 * On prend le tag comme version et l'asset « *master*.bin » comme firmware du MASTER ; les autres
 * .bin (worker…) sont listés pour l'interface. Pas de SHA séparé : l'image ESP porte son propre
 * SHA-256, vérifié par esp_ota_end au flash. */
static void check_github(char *out, size_t cap)
{
    char url[160];
    snprintf(url, sizeof(url), "https://api.github.com/repos/%s/releases/latest", g_lab_cfg.github_repo);
    char *b = heap_caps_malloc(16384, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!b) b = malloc(16384);
    if (!b) { snprintf(out, cap, "{\"available\":false,\"reason\":\"mémoire\"}"); return; }
    bool got = read_text_https(url, b, 16384);
    cJSON *j = got ? cJSON_Parse(b) : NULL;
    free(b);
    if (!got || !j) {
        if (j) cJSON_Delete(j);
        snprintf(out, cap, "{\"available\":false,\"reason\":\"aucune Release trouvée sur GitHub (créez-en une avec un fichier .bin)\"}");
        return;
    }
    cJSON *tag = cJSON_GetObjectItem(j, "tag_name");
    cJSON *body = cJSON_GetObjectItem(j, "body");
    cJSON *assets = cJSON_GetObjectItem(j, "assets");
    const char *ver = cJSON_IsString(tag) ? tag->valuestring : "";
    while (*ver == 'v' || *ver == 'V') ver++;   /* tag « v6.2.0 » → « 6.2.0 » */
    char master_url[256] = "";
    char master_sha[65] = "";
    size_t master_size = 0;
    new_assets[0] = 0;
    cJSON *a;
    cJSON_ArrayForEach(a, assets) {
        cJSON *nm = cJSON_GetObjectItem(a, "name");
        cJSON *du = cJSON_GetObjectItem(a, "browser_download_url");
        cJSON *dg = cJSON_GetObjectItem(a, "digest");
        cJSON *sz = cJSON_GetObjectItem(a, "size");
        if (!cJSON_IsString(nm) || !cJSON_IsString(du)) continue;
        size_t ln = strlen(nm->valuestring);
        if (ln < 5 || strcasecmp(nm->valuestring + ln - 4, ".bin") != 0) continue;
        if (is_master_asset(nm->valuestring) && !master_url[0]) {
            char prefix[128];
            snprintf(prefix, sizeof(prefix), "https://github.com/%s/releases/download/", g_lab_cfg.github_repo);
            const char *digest = cJSON_IsString(dg) ? dg->valuestring : "";
            const char *url = du->valuestring;
            size_t asset_size = cJSON_IsNumber(sz) && sz->valuedouble > 0 ? (size_t)sz->valuedouble : 0;
            if (strncmp(digest, "sha256:", 7) == 0 && hex64(digest + 7) && asset_size > 0 &&
                strncmp(url, prefix, strlen(prefix)) == 0 && strlen(url) < sizeof(master_url)) {
                strlcpy(master_url, url, sizeof(master_url));
                strlcpy(master_sha, digest + 7, sizeof(master_sha));
                master_size = asset_size;
            }
        } else {  /* worker et autres : listés pour l'UI (téléchargés par le navigateur, pas par le MASTER) */
            size_t used = strlen(new_assets);
            snprintf(new_assets + used, sizeof(new_assets) - used, "%s%s|%s", used ? ";" : "", nm->valuestring, du->valuestring);
        }
    }
    cJSON *res = cJSON_CreateObject();
    cJSON_AddStringToObject(res, "source", "github");
    cJSON_AddStringToObject(res, "repo", g_lab_cfg.github_repo);
    if (!ver[0] || !master_url[0]) {
        available = master_url[0] ? available : false;
        cJSON_AddBoolToObject(res, "available", false);
        cJSON_AddStringToObject(res, "current", LAB_VERSION);
        if (ver[0]) cJSON_AddStringToObject(res, "latest", ver);
        cJSON_AddStringToObject(res, "reason", !master_url[0] ? "la Release doit contenir un .bin MASTER avec empreinte SHA-256 GitHub valide" : "version identique ou plus ancienne");
        if (new_assets[0]) cJSON_AddStringToObject(res, "assets", new_assets);
    } else if (vercmp(ver, LAB_VERSION) <= 0) {
        available = false;
        cJSON_AddBoolToObject(res, "available", false);
        cJSON_AddStringToObject(res, "current", LAB_VERSION);
        cJSON_AddStringToObject(res, "latest", ver);
        cJSON_AddStringToObject(res, "reason", "déjà à jour");
        if (new_assets[0]) cJSON_AddStringToObject(res, "assets", new_assets);
    } else {
        strlcpy(new_ver, ver, sizeof(new_ver));
        strlcpy(new_url, master_url, sizeof(new_url));
        strlcpy(new_sha, master_sha, sizeof(new_sha));
        new_size = master_size;
        new_from_github = true;
        strlcpy(new_notes, cJSON_IsString(body) ? body->valuestring : "", sizeof(new_notes));
        available = true;
        approved = false;
        int64_t now_ms = esp_timer_get_time() / 1000;
        if (now_ms - last_notify_ms > 60LL * 60LL * 1000LL) {
            char msg[160];
            snprintf(msg, sizeof(msg), "Mise a jour %s disponible sur GitHub (actuelle %s). Ouvrez le tableau de bord ESP32 LAB pour l'installer.", new_ver, LAB_VERSION);
            notifications_send(msg);
            evlog_add('I', "ota", "mise à jour GitHub %s disponible", new_ver);
            last_notify_ms = now_ms;
        }
        cJSON_AddBoolToObject(res, "available", true);
        cJSON_AddStringToObject(res, "version", new_ver);
        cJSON_AddStringToObject(res, "notes", new_notes);
        if (new_assets[0]) cJSON_AddStringToObject(res, "assets", new_assets);
    }
    cJSON_Delete(j);
    char *str = cJSON_PrintUnformatted(res);
    cJSON_Delete(res);
    if (str) { strlcpy(out, str, cap); free(str); }
    else snprintf(out, cap, "{\"available\":false}");
}

void ota_check_now(char *out, size_t cap)
{
    if (!out || cap == 0) return;
    if (!wifi_lab_sta_connected()) {
        snprintf(out, cap, "{\"available\":false,\"reason\":\"Internet indisponible (connectez le MASTER à votre Wi-Fi maison)\"}");
        return;
    }
    if (g_lab_cfg.github_repo[0]) { check_github(out, cap); return; }
    if (!g_lab_cfg.update_manifest[0]) {
        snprintf(out, cap, "{\"available\":false,\"reason\":\"aucune source configurée : indiquez votre dépôt GitHub dans Réglages\"}");
        return;
    }
    char *b = calloc(1, 3072);
    if (!b) { snprintf(out, cap, "{\"available\":false,\"reason\":\"mémoire\"}"); return; }
    if (!read_text_https(g_lab_cfg.update_manifest, b, 3072)) {
        free(b);
        snprintf(out, cap, "{\"available\":false,\"reason\":\"manifeste injoignable\"}");
        return;
    }
    cJSON *j = cJSON_Parse(b);
    free(b);
    if (!j) {
        snprintf(out, cap, "{\"available\":false,\"reason\":\"manifeste invalide\"}");
        return;
    }
    cJSON *v = cJSON_GetObjectItem(j, "version");
    cJSON *u = cJSON_GetObjectItem(j, "master_url");
    cJSON *s = cJSON_GetObjectItem(j, "master_sha256");
    cJSON *n = cJSON_GetObjectItem(j, "notes");
    cJSON *res = cJSON_CreateObject();
    if (!cJSON_IsString(v) || !cJSON_IsString(u) || !cJSON_IsString(s) || vercmp(v->valuestring, LAB_VERSION) <= 0 ||
        strncmp(u->valuestring, "https://", 8) != 0 || !hex64(s->valuestring) || strlen(u->valuestring) >= sizeof(new_url)) {
        available = false;
        cJSON_AddBoolToObject(res, "available", false);
        cJSON_AddStringToObject(res, "current", LAB_VERSION);
        if (cJSON_IsString(v)) cJSON_AddStringToObject(res, "latest", v->valuestring);
    } else {
        strlcpy(new_ver, v->valuestring, sizeof(new_ver));
        strlcpy(new_url, u->valuestring, sizeof(new_url));
        strlcpy(new_sha, s->valuestring, sizeof(new_sha));
        new_size = 0;
        strlcpy(new_notes, cJSON_IsString(n) ? n->valuestring : "", sizeof(new_notes));
        new_from_github = false;
        available = true;
        approved = false;
        int64_t now_ms = esp_timer_get_time() / 1000;
        if (now_ms - last_notify_ms > 60LL * 60LL * 1000LL) {
            char msg[96];
            snprintf(msg, sizeof(msg), "Nouvelle version %s disponible (actuelle %s).", new_ver, LAB_VERSION);
            notifications_send(msg);
            evlog_add('I', "ota", "%s", msg);
            last_notify_ms = now_ms;
        }
        cJSON_AddBoolToObject(res, "available", true);
        cJSON_AddStringToObject(res, "version", new_ver);
        cJSON_AddStringToObject(res, "notes", new_notes);
    }
    cJSON_Delete(j);
    char *str = cJSON_PrintUnformatted(res);
    cJSON_Delete(res);
    if (str) { strlcpy(out, str, cap); free(str); }
    else snprintf(out, cap, "{\"available\":false}");
}

/* Téléchargement direct vers la partition OTA avec SHA-256 calculé à la volée
 * (plus besoin de microSD pour les mises à jour Internet). */
static esp_err_t download_and_flash(void)
{
    const esp_partition_t *p = esp_ota_get_next_update_partition(NULL);
    if (!p) return ESP_ERR_NOT_FOUND;
    esp_http_client_config_t cfg = {.url = new_url, .timeout_ms = 30000, .crt_bundle_attach = esp_crt_bundle_attach,
                                    .buffer_size = 4096, .max_redirection_count = 5, .user_agent = "ESP32-LAB"};
    esp_http_client_handle_t h = esp_http_client_init(&cfg);
    if (!h) return ESP_FAIL;
    esp_err_t r = esp_http_client_open(h, 0);
    if (r != ESP_OK) { esp_http_client_cleanup(h); return r; }
    int64_t content_len = esp_http_client_fetch_headers(h);
    int code = esp_http_client_get_status_code(h);
    if (!hex64(new_sha) || code != 200 || content_len <= 0 || (size_t)content_len > p->size ||
        (new_size && (size_t)content_len != new_size)) {
        esp_http_client_close(h);
        esp_http_client_cleanup(h);
        return ESP_ERR_INVALID_SIZE;
    }
    esp_ota_handle_t oh = 0;
    r = esp_ota_begin(p, OTA_WITH_SEQUENTIAL_WRITES, &oh);
    if (r != ESP_OK) { esp_http_client_close(h); esp_http_client_cleanup(h); return r; }
    psa_crypto_init();
    psa_hash_operation_t op = PSA_HASH_OPERATION_INIT;
    psa_hash_setup(&op, PSA_ALG_SHA_256);
    uint8_t *buf = malloc(4096);
    size_t total = 0;
    if (!buf) r = ESP_ERR_NO_MEM;
    while (r == ESP_OK) {
        int n = esp_http_client_read(h, (char *)buf, 4096);
        if (n < 0) { r = ESP_FAIL; break; }
        if (n == 0) break;
        if (total + (size_t)n > p->size) { r = ESP_ERR_INVALID_SIZE; break; }
        psa_hash_update(&op, buf, (size_t)n);
        r = esp_ota_write(oh, buf, (size_t)n);
        total += (size_t)n;
    }
    free(buf);
    if (r == ESP_OK && ((int64_t)total != content_len || (new_size && total != new_size))) r = ESP_ERR_INVALID_SIZE;
    esp_http_client_close(h);
    esp_http_client_cleanup(h);
    uint8_t d[32];
    size_t dl = 0;
    char got[65] = {0};
    if (r == ESP_OK && psa_hash_finish(&op, d, sizeof(d), &dl) == PSA_SUCCESS) {
        for (int i = 0; i < 32; i++) snprintf(got + i * 2, 3, "%02x", d[i]);
        if (strcasecmp(got, new_sha) != 0) {   /* digest GitHub ou SHA-256 du manifeste */
            ESP_LOGE(TAG, "SHA-256 différent : reçu %s attendu %s", got, new_sha);
            r = ESP_ERR_INVALID_CRC;
        }
    } else {
        psa_hash_abort(&op);
        if (r == ESP_OK) r = ESP_FAIL;
    }
    if (r != ESP_OK) { esp_ota_abort(oh); return r; }
    r = esp_ota_end(oh); /* vérifie aussi l'image (en-tête, somme) */
    if (r != ESP_OK) return r;
    return esp_ota_set_boot_partition(p);
}

static void task_apply(void *arg)
{
    (void)arg;
    s_busy = true;
    led_status_mode("update");
    evlog_add('I', "ota", "installation de la version %s…", new_ver);
    esp_err_t r = download_and_flash();
    char msg[160];
    if (r == ESP_OK) {
        snprintf(msg, sizeof(msg), "Mise à jour %s installée, redémarrage.", new_ver);
        evlog_add('S', "ota", "%s", msg);
        notifications_send(msg);
        vTaskDelay(pdMS_TO_TICKS(1500));
        esp_restart();
    }
    snprintf(msg, sizeof(msg), "Échec de la mise à jour %s (%s).", new_ver, esp_err_to_name(r));
    evlog_add('E', "ota", "%s", msg);
    notifications_send(msg);
    led_status_mode("error");
    approved = false;
    s_busy = false;
    vTaskDelete(NULL);
}

void ota_approve(char *out, size_t cap)
{
    if (!out || cap == 0) return;
    if (!available) { snprintf(out, cap, "{\"ok\":false,\"reason\":\"aucune mise à jour valide\"}"); return; }
    if (ota_busy()) { snprintf(out, cap, "{\"ok\":false,\"reason\":\"déjà en cours\"}"); return; }
    approved = true;
    if (xTaskCreate(task_apply, "ota_apply", 8192, NULL, 5, NULL) != pdPASS) {
        approved = false;
        snprintf(out, cap, "{\"ok\":false,\"reason\":\"tâche impossible\"}");
        return;
    }
    snprintf(out, cap, "{\"ok\":true,\"version\":\"%s\"}", new_ver);
}

static void reboot_task(void *arg)
{
    (void)arg;
    vTaskDelay(pdMS_TO_TICKS(1500));
    esp_restart();
}

esp_err_t ota_upload_handler(httpd_req_t *req, char *msg, size_t cap)
{
    const esp_partition_t *p = esp_ota_get_next_update_partition(NULL);
    if (!p) { snprintf(msg, cap, "partition OTA introuvable"); return ESP_ERR_NOT_FOUND; }
    if (ota_busy()) { snprintf(msg, cap, "une mise à jour est déjà en cours"); return ESP_ERR_INVALID_STATE; }
    if (req->content_len < 1024 || req->content_len > p->size) {
        snprintf(msg, cap, "taille invalide (%u octets, max %u)", (unsigned)req->content_len, (unsigned)p->size);
        return ESP_ERR_INVALID_SIZE;
    }
    s_busy = true;
    led_status_mode("update");
    esp_ota_handle_t oh = 0;
    esp_err_t r = esp_ota_begin(p, OTA_WITH_SEQUENTIAL_WRITES, &oh);
    uint8_t *buf = malloc(4096);
    if (!buf && r == ESP_OK) { esp_ota_abort(oh); r = ESP_ERR_NO_MEM; }
    size_t remaining = req->content_len;
    bool first = true;
    while (r == ESP_OK && remaining > 0) {
        int n = httpd_req_recv(req, (char *)buf, remaining > 4096 ? 4096 : remaining);
        if (n == HTTPD_SOCK_ERR_TIMEOUT) continue;
        if (n <= 0) { r = ESP_FAIL; break; }
        if (first) {
            first = false;
            if (buf[0] != 0xE9) { r = ESP_ERR_INVALID_VERSION; break; } /* octet magique d'une image ESP */
        }
        r = esp_ota_write(oh, buf, (size_t)n);
        remaining -= (size_t)n;
    }
    free(buf);
    if (r == ESP_OK) r = esp_ota_end(oh);
    else if (oh) esp_ota_abort(oh);
    if (r == ESP_OK) r = esp_ota_set_boot_partition(p);
    s_busy = false;
    if (r != ESP_OK) {
        led_status_mode("error");
        snprintf(msg, cap, "échec : %s", esp_err_to_name(r));
        evlog_add('E', "ota", "mise à jour par fichier refusée (%s)", esp_err_to_name(r));
        return r;
    }
    snprintf(msg, cap, "image vérifiée et installée dans %s ; redémarrage…", p->label);
    evlog_add('S', "ota", "firmware installé depuis le navigateur (%u octets)", (unsigned)req->content_len);
    xTaskCreate(reboot_task, "reboot", 2048, NULL, 5, NULL);
    return ESP_OK;
}

static void ota_check_task(void *arg)
{
    (void)arg;
    vTaskDelay(pdMS_TO_TICKS(30000));
    for (;;) {
        if (g_lab_cfg.auto_updates && wifi_lab_sta_connected()) {
            char out[400];
            ota_check_now(out, sizeof(out));
        }
        vTaskDelay(pdMS_TO_TICKS(UPDATE_INTERVAL_MS));
    }
}

void ota_manager_start(void)
{
    xTaskCreate(ota_check_task, "ota_check", 6144, NULL, 2, NULL);
}
