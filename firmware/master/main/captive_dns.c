#include "captive_dns.h"
#include "lab_config.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "lwip/inet.h"
#include "lwip/sockets.h"
#include <string.h>

static const char *TAG = "captive_dns";
static volatile bool s_running = false;
static volatile bool s_enabled = false;

bool captive_dns_running(void) { return s_running && s_enabled; }

/* Construit la réponse dans `buf` (la requête y est déjà). Renvoie la taille ou -1. */
static int build_answer(uint8_t *buf, int len, int cap)
{
    if (len < 12) return -1;
    uint16_t qdcount = (uint16_t)((buf[4] << 8) | buf[5]);
    if ((buf[2] & 0x80) || qdcount != 1) return -1; /* pas une requête simple */

    /* Parcours du nom de la question. */
    int p = 12;
    while (p < len && buf[p] != 0) {
        if ((buf[p] & 0xC0) != 0) return -1;
        p += buf[p] + 1;
    }
    p++; /* octet nul final */
    if (p + 4 > len) return -1;
    uint16_t qtype = (uint16_t)((buf[p] << 8) | buf[p + 1]);
    uint16_t qclass = (uint16_t)((buf[p + 2] << 8) | buf[p + 3]);
    int qend = p + 4;

    buf[2] = 0x84 | (buf[2] & 0x01); /* QR=1, AA=1, RD copié */
    buf[3] = 0x80;                   /* RA=1, RCODE=0 */
    buf[6] = 0; buf[7] = 0;          /* ANCOUNT */
    buf[8] = 0; buf[9] = 0;          /* NSCOUNT */
    buf[10] = 0; buf[11] = 0;        /* ARCOUNT */

    if (qtype != 1 || qclass != 1) return qend; /* seulement les requêtes A/IN reçoivent une adresse */
    if (qend + 16 > cap) return -1;
    buf[7] = 1;
    uint8_t *a = buf + qend;
    a[0] = 0xC0; a[1] = 0x0C;       /* pointeur vers le nom de la question */
    a[2] = 0x00; a[3] = 0x01;       /* type A */
    a[4] = 0x00; a[5] = 0x01;       /* classe IN */
    a[6] = 0x00; a[7] = 0x00; a[8] = 0x00; a[9] = 0x3C; /* TTL 60 s */
    a[10] = 0x00; a[11] = 0x04;
    a[12] = 192; a[13] = 168; a[14] = 4; a[15] = 1;
    return qend + 16;
}

static void dns_task(void *arg)
{
    (void)arg;
    int s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s < 0) {
        ESP_LOGE(TAG, "socket");
        vTaskDelete(NULL);
        return;
    }
    struct sockaddr_in a = {0};
    a.sin_family = AF_INET;
    a.sin_port = htons(53);
    a.sin_addr.s_addr = inet_addr(AP_IP_STR); /* uniquement côté point d'accès */
    if (bind(s, (struct sockaddr *)&a, sizeof(a)) != 0) {
        ESP_LOGE(TAG, "bind 53");
        close(s);
        vTaskDelete(NULL);
        return;
    }
    s_running = true;
    ESP_LOGI(TAG, "portail captif actif");
    uint8_t buf[512];
    for (;;) {
        struct sockaddr_in from;
        socklen_t fl = sizeof(from);
        int n = recvfrom(s, buf, sizeof(buf), 0, (struct sockaddr *)&from, &fl);
        if (n <= 0) continue;
        if (s_enabled) {
            int out = build_answer(buf, n, sizeof(buf));
            if (out > 0) sendto(s, buf, out, 0, (struct sockaddr *)&from, fl);
        }
    }
}

void captive_dns_start(void)
{
    s_enabled = true;
    if (s_running) return;
    xTaskCreate(dns_task, "captive_dns", 3072, NULL, 3, NULL);
}

void captive_dns_stop(void)
{
    /* Keep the AP-bound socket alive so offline fallback can enable DNS immediately. */
    s_enabled = false;
}
