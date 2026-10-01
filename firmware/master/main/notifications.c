#include "notifications.h"
#include "lab_config.h"
#include "event_log.h"
#include "wifi_lab.h"
#include "cJSON.h"
#include "esp_crt_bundle.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *TAG = "notify";
static QueueHandle_t s_q = NULL;

bool notifications_configured(void)
{
    return (g_lab_cfg.whatsapp_phone[0] && g_lab_cfg.whatsapp_api[0]) || g_lab_cfg.webhook_url[0];
}

static void urlenc(const char *in, char *out, size_t cap)
{
    static const char h[] = "0123456789ABCDEF";
    size_t o = 0;
    while (*in && o + 4 < cap) {
        unsigned char c = (unsigned char)*in++;
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') out[o++] = (char)c;
        else {
            out[o++] = '%';
            out[o++] = h[c >> 4];
            out[o++] = h[c & 15];
        }
    }
    out[o] = 0;
}

static int http_request(const char *url, esp_http_client_method_t method, const char *ctype, const char *body)
{
    esp_http_client_config_t c = {
        .url = url,
        .method = method,
        .timeout_ms = 15000,
        .crt_bundle_attach = esp_crt_bundle_attach,
    };
    esp_http_client_handle_t h = esp_http_client_init(&c);
    if (!h) return -1;
    if (ctype) esp_http_client_set_header(h, "Content-Type", ctype);
    if (body) esp_http_client_set_post_field(h, body, (int)strlen(body));
    esp_err_t r = esp_http_client_perform(h);
    int code = r == ESP_OK ? esp_http_client_get_status_code(h) : -1;
    esp_http_client_cleanup(h);
    return code;
}

/* Codes renvoyés : 0 = canal non configuré, -1 = erreur réseau, sinon statut HTTP. */
static int s_last_wa, s_last_wh;

static int send_whatsapp(const char *text)
{
    if (!g_lab_cfg.whatsapp_phone[0] || !g_lab_cfg.whatsapp_api[0]) return 0;
    char *msg = malloc(1536), *url = malloc(2048);
    char phone[96], key[200];
    if (!msg || !url) { free(msg); free(url); return -1; }
    /* Le numéro « +33… » doit être encodé : dans une URL, un « + » brut devient une espace. */
    size_t o = 0;
    for (const char *p = g_lab_cfg.whatsapp_phone; *p && o + 1 < sizeof(phone) - 3; ++p)
        if (*p != ' ' && *p != '.' && *p != '-') phone[o++] = *p;
    phone[o] = 0;
    char phone_enc[128];
    urlenc(phone, phone_enc, sizeof(phone_enc));
    urlenc(g_lab_cfg.whatsapp_api, key, sizeof(key));
    urlenc(text, msg, 1536);
    snprintf(url, 2048, "https://api.callmebot.com/whatsapp.php?phone=%s&text=%s&apikey=%s", phone_enc, msg, key);
    int code = http_request(url, HTTP_METHOD_GET, NULL, NULL);
    free(msg);
    free(url);
    return code;
}

/* Format adapté au service reconnu dans l'URL :
 *  - Discord (discord.com/api/webhooks/…)       → {"content": …}
 *  - ntfy (ntfy.sh/<sujet> ou serveur ntfy)      → texte brut + en-tête Title
 *  - Telegram (api.telegram.org/bot…/sendMessage?chat_id=…) → {"text": …}
 *  - Slack, Mattermost, Google Chat, n8n, Node-RED, Home Assistant… → JSON générique text/content/message. */
static int send_webhook(const char *text)
{
    const char *u = g_lab_cfg.webhook_url;
    if (!u[0]) return 0;
    char full[400];
    snprintf(full, sizeof(full), "[" LAB_NAME "] %s", text);
    if (strstr(u, "ntfy")) {
        esp_http_client_config_t c = {.url = u, .method = HTTP_METHOD_POST, .timeout_ms = 15000, .crt_bundle_attach = esp_crt_bundle_attach};
        esp_http_client_handle_t h = esp_http_client_init(&c);
        if (!h) return -1;
        esp_http_client_set_header(h, "Content-Type", "text/plain; charset=utf-8");
        esp_http_client_set_header(h, "Title", LAB_NAME);
        esp_http_client_set_header(h, "Tags", "robot");
        esp_http_client_set_post_field(h, text, (int)strlen(text));
        esp_err_t r = esp_http_client_perform(h);
        int code = r == ESP_OK ? esp_http_client_get_status_code(h) : -1;
        esp_http_client_cleanup(h);
        return code;
    }
    cJSON *j = cJSON_CreateObject();
    if (!j) return -1;
    if (strstr(u, "discord.com/api/webhooks") || strstr(u, "discordapp.com/api/webhooks")) {
        cJSON_AddStringToObject(j, "content", full);
        cJSON_AddStringToObject(j, "username", LAB_NAME);
    } else if (strstr(u, "api.telegram.org")) {
        cJSON_AddStringToObject(j, "text", full);
    } else {
        cJSON_AddStringToObject(j, "text", full);    /* Slack, Mattermost, Google Chat */
        cJSON_AddStringToObject(j, "content", full); /* Discord (compatible) */
        cJSON_AddStringToObject(j, "title", LAB_NAME);
        cJSON_AddStringToObject(j, "message", text); /* Gotify, Home Assistant, n8n */
    }
    char *body = cJSON_PrintUnformatted(j);
    cJSON_Delete(j);
    if (!body) return -1;
    int code = http_request(u, HTTP_METHOD_POST, "application/json", body);
    free(body);
    return code;
}

static bool deliver(const char *text)
{
    if (!wifi_lab_sta_connected()) return false;
    s_last_wa = send_whatsapp(text);
    s_last_wh = send_webhook(text);
    return (s_last_wa >= 200 && s_last_wa < 300) || (s_last_wh >= 200 && s_last_wh < 300);
}

static void notify_task(void *arg)
{
    (void)arg;
    for (;;) {
        char *msg = NULL;
        if (xQueueReceive(s_q, &msg, portMAX_DELAY) == pdTRUE && msg) {
            if (!deliver(msg)) ESP_LOGW(TAG, "notification non envoyée : %s", msg);
            free(msg);
        }
    }
}

void notifications_start(void)
{
    if (s_q) return;
    s_q = xQueueCreate(8, sizeof(char *));
    if (s_q) xTaskCreate(notify_task, "notify", 6144, NULL, 3, NULL);
}

bool notifications_send(const char *text)
{
    if (!text || !s_q || !notifications_configured()) return false;
    char *copy = strdup(text);
    if (!copy) return false;
    if (xQueueSend(s_q, &copy, 0) != pdTRUE) {
        free(copy);
        return false;
    }
    return true;
}

void notifications_test(char *out, size_t cap)
{
    if (!notifications_configured()) {
        snprintf(out, cap, "{\"ok\":false,\"reason\":\"aucun canal configuré\"}");
        return;
    }
    if (!wifi_lab_sta_connected()) {
        snprintf(out, cap, "{\"ok\":false,\"reason\":\"pas de connexion Internet (Wi-Fi STA)\"}");
        return;
    }
    bool ok = deliver("Test de notification : la liaison fonctionne \xF0\x9F\x91\x8B");
    evlog_add(ok ? 'S' : 'E', "notify", "test de notification : WhatsApp %d, webhook %d", s_last_wa, s_last_wh);
    char why[160] = "";
    if (!ok) {
        if (s_last_wa && (s_last_wa < 200 || s_last_wa >= 300))
            snprintf(why, sizeof(why), "WhatsApp : HTTP %d (numéro au format +33…, clé CallMeBot reçue par WhatsApp ?)", s_last_wa);
        else if (s_last_wh && (s_last_wh < 200 || s_last_wh >= 300))
            snprintf(why, sizeof(why), "Webhook : HTTP %d (URL complète du service ?)", s_last_wh);
    }
    snprintf(out, cap, "{\"ok\":%s,\"whatsapp\":%d,\"webhook\":%d,\"reason\":\"%s\"}", ok ? "true" : "false", s_last_wa, s_last_wh, why);
}
