#include "wifi_lab.h"
#include "lab_config.h"
#include "captive_dns.h"
#include "event_log.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_netif_sntp.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "mdns.h"
#include "lwip/opt.h"
#if IP_NAPT
#include "lwip/lwip_napt.h"
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

static const char *TAG = "wifi_lab";
static volatile bool s_sta_ok = false;
static char s_sta_ip[20] = "-";
static esp_timer_handle_t s_retry_timer = NULL;
static uint32_t s_retry_delay_ms = 2000;
static bool s_sntp_started = false;
static esp_netif_t *s_ap_if = NULL;
static esp_netif_t *s_sta_if = NULL;
static volatile bool s_internet_shared = false;

#define SCAN_MAX 24
static wifi_ap_record_t *s_scan = NULL;
static uint16_t s_scan_count = 0;
static volatile int s_scan_state = 0; /* 0 idle, 1 running, 2 done */
static SemaphoreHandle_t s_scan_mx = NULL;

static void retry_cb(void *arg)
{
    (void)arg;
    if (g_lab_cfg.sta_ssid[0] && !s_sta_ok) esp_wifi_connect();
}

static void start_sntp(void)
{
    if (s_sntp_started || !g_lab_cfg.ntp_server[0]) return;
    esp_sntp_config_t cfg = ESP_NETIF_SNTP_DEFAULT_CONFIG(g_lab_cfg.ntp_server);
    cfg.start = true;
    if (esp_netif_sntp_init(&cfg) == ESP_OK) {
        s_sntp_started = true;
        ESP_LOGI(TAG, "SNTP démarré (%s)", g_lab_cfg.ntp_server);
    }
}


static void set_ap_dns(const esp_netif_dns_info_t *dns)
{
    if (!s_ap_if || !dns) return;
    esp_err_t stop = esp_netif_dhcps_stop(s_ap_if);
    if (stop != ESP_OK && stop != ESP_ERR_ESP_NETIF_DHCP_ALREADY_STOPPED) {
        ESP_LOGW(TAG, "arrêt DHCP AP impossible avant changement DNS: %s", esp_err_to_name(stop));
        return;
    }
    esp_err_t set = esp_netif_set_dns_info(s_ap_if, ESP_NETIF_DNS_MAIN, dns);
    esp_err_t start = esp_netif_dhcps_start(s_ap_if);
    if (set != ESP_OK) ESP_LOGW(TAG, "DNS DHCP AP non modifié: %s", esp_err_to_name(set));
    if (start != ESP_OK && start != ESP_ERR_ESP_NETIF_DHCP_ALREADY_STARTED)
        ESP_LOGW(TAG, "redémarrage DHCP AP impossible: %s", esp_err_to_name(start));
}

static void enable_internet_sharing(void)
{
#if IP_NAPT
    if (!s_ap_if || !s_sta_if) return;
    esp_netif_dns_info_t dns = {0};
    if (esp_netif_get_dns_info(s_sta_if, ESP_NETIF_DNS_MAIN, &dns) == ESP_OK &&
        dns.ip.type == ESP_IPADDR_TYPE_V4 && dns.ip.u_addr.ip4.addr != 0) {
        set_ap_dns(&dns);
    } else {
        ESP_LOGW(TAG, "DNS amont indisponible; DNS du point d'accès conservé");
    }
    esp_err_t route = esp_netif_set_default_netif(s_sta_if);
    esp_err_t nat = esp_netif_napt_enable(s_ap_if);
    if (route == ESP_OK && nat == ESP_OK) {
        s_internet_shared = true;
        captive_dns_stop();
        ESP_LOGI(TAG, "partage Internet actif: AP -> STA (NAPT), Pi et workers gardent l'accès local au S3");
    } else {
        s_internet_shared = false;
        ESP_LOGW(TAG, "partage Internet non activé (route=%s, NAPT=%s)",
                 esp_err_to_name(route), esp_err_to_name(nat));
    }
#else
    ESP_LOGW(TAG, "partage Internet désactivé: activer CONFIG_LWIP_IP_FORWARD et CONFIG_LWIP_IPV4_NAPT");
#endif
}

static void disable_internet_sharing(void)
{
    s_internet_shared = false;
    if (s_ap_if) {
        esp_netif_ip_info_t ap_info = {0};
        if (esp_netif_get_ip_info(s_ap_if, &ap_info) == ESP_OK) {
            esp_netif_dns_info_t dns = {0};
            dns.ip.type = ESP_IPADDR_TYPE_V4;
            dns.ip.u_addr.ip4 = ap_info.ip;
            set_ap_dns(&dns);
        }
    }
#if IP_NAPT
    if (s_ap_if) (void)esp_netif_napt_disable(s_ap_if);
#endif
    if (s_ap_if) (void)esp_netif_set_default_netif(s_ap_if);
    if (g_lab_cfg.captive_portal) captive_dns_start();
}

static const char *auth_name(wifi_auth_mode_t m)
{
    switch (m) {
    case WIFI_AUTH_OPEN: return "OPEN";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA";
    case WIFI_AUTH_WPA2_PSK: return "WPA2";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA/WPA2";
    case WIFI_AUTH_WPA3_PSK: return "WPA3";
    case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2/WPA3";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2-EAP";
    default: return "AUTRE";
    }
}

static void evt(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    (void)arg;
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        bool was = s_sta_ok;
        s_sta_ok = false;
        disable_internet_sharing();
        strlcpy(s_sta_ip, "-", sizeof(s_sta_ip));
        if (was) evlog_add('W', "wifi", "connexion Internet (STA) perdue");
        if (g_lab_cfg.sta_ssid[0] && s_retry_timer) {
            /* Recul exponentiel : évite de saturer la radio si le mot de passe est faux. */
            esp_timer_stop(s_retry_timer);
            esp_timer_start_once(s_retry_timer, (uint64_t)s_retry_delay_ms * 1000ULL);
            if (s_retry_delay_ms < 60000) s_retry_delay_ms *= 2;
        }
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_AP_STACONNECTED) {
        wifi_event_ap_staconnected_t *e = data;
        ESP_LOGI(TAG, "client AP connecté " MACSTR, MAC2STR(e->mac));
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_SCAN_DONE) {
        if (s_scan_mx && xSemaphoreTake(s_scan_mx, pdMS_TO_TICKS(100)) == pdTRUE) {
            uint16_t n = SCAN_MAX;
            if (!s_scan) s_scan = calloc(SCAN_MAX, sizeof(wifi_ap_record_t));
            if (s_scan && esp_wifi_scan_get_ap_records(&n, s_scan) == ESP_OK) s_scan_count = n;
            else s_scan_count = 0;
            s_scan_state = 2;
            xSemaphoreGive(s_scan_mx);
        }
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *e = data;
        snprintf(s_sta_ip, sizeof(s_sta_ip), IPSTR, IP2STR(&e->ip_info.ip));
        s_sta_ok = true;
        s_retry_delay_ms = 2000;
        evlog_add('S', "wifi", "Internet connecté (%s, IP %s)", g_lab_cfg.sta_ssid, s_sta_ip);
        start_sntp();
        enable_internet_sharing();
    }
}

void wifi_lab_start(void)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    s_ap_if = esp_netif_create_default_wifi_ap();
    s_sta_if = esp_netif_create_default_wifi_sta();
    if (s_sta_if) esp_netif_set_hostname(s_sta_if, g_lab_cfg.hostname);
    s_scan_mx = xSemaphoreCreateMutex();

    setenv("TZ", g_lab_cfg.timezone, 1);
    tzset();

    wifi_init_config_t icfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&icfg));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &evt, NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &evt, NULL));

    const esp_timer_create_args_t targs = {.callback = retry_cb, .name = "sta_retry"};
    esp_timer_create(&targs, &s_retry_timer);

    wifi_config_t ap = {0};
    strlcpy((char *)ap.ap.ssid, g_lab_cfg.ap_ssid, sizeof(ap.ap.ssid));
    strlcpy((char *)ap.ap.password, g_lab_cfg.ap_pass, sizeof(ap.ap.password));
    ap.ap.ssid_len = (uint8_t)strlen(g_lab_cfg.ap_ssid);
    ap.ap.channel = g_lab_cfg.ap_channel;
    ap.ap.max_connection = 10;
    ap.ap.authmode = WIFI_AUTH_WPA2_PSK;
    ap.ap.pmf_cfg.required = false;
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap));

    wifi_config_t sta = {0};
    strlcpy((char *)sta.sta.ssid, g_lab_cfg.sta_ssid, sizeof(sta.sta.ssid));
    strlcpy((char *)sta.sta.password, g_lab_cfg.sta_pass, sizeof(sta.sta.password));
    sta.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
    sta.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;
    sta.sta.threshold.authmode = g_lab_cfg.sta_pass[0] ? WIFI_AUTH_WPA_PSK : WIFI_AUTH_OPEN;
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta));
    ESP_ERROR_CHECK(esp_wifi_start());
    if (g_lab_cfg.sta_ssid[0]) esp_wifi_connect();

    if (mdns_init() == ESP_OK) {
        mdns_hostname_set(g_lab_cfg.hostname);
        mdns_instance_name_set(LAB_NAME " " LAB_VERSION);
        mdns_service_add(LAB_NAME, "_http", "_tcp", HTTP_PORT, NULL, 0);
        ESP_LOGI(TAG, "mDNS : http://%s.local/", g_lab_cfg.hostname);
    }
    if (g_lab_cfg.captive_portal && !s_internet_shared) captive_dns_start();
    ESP_LOGI(TAG, "point d'accès \"%s\" canal %u sur " AP_IP_STR, g_lab_cfg.ap_ssid, g_lab_cfg.ap_channel);
}

bool wifi_lab_sta_connected(void) { return s_sta_ok; }
bool wifi_lab_internet_shared(void) { return s_internet_shared; }
const char *wifi_lab_sta_ip(void) { return s_sta_ip; }

int wifi_lab_sta_rssi(void)
{
    if (!s_sta_ok) return 0;
    wifi_ap_record_t info;
    if (esp_wifi_sta_get_ap_info(&info) == ESP_OK) return info.rssi;
    return 0;
}

int wifi_lab_ap_clients(void)
{
    wifi_sta_list_t list;
    if (esp_wifi_ap_get_sta_list(&list) == ESP_OK) return list.num;
    return 0;
}

bool wifi_lab_time_synced(void)
{
    return time(NULL) > 1700000000;
}

esp_err_t wifi_lab_scan_start(void)
{
    if (s_scan_state == 1) return ESP_ERR_INVALID_STATE;
    wifi_scan_config_t sc = {.show_hidden = false, .scan_type = WIFI_SCAN_TYPE_ACTIVE};
    s_scan_state = 1;
    esp_err_t r = esp_wifi_scan_start(&sc, false);
    if (r != ESP_OK) s_scan_state = 0;
    return r;
}

void wifi_lab_scan_json(cJSON *obj)
{
    if (!obj) return;
    cJSON_AddStringToObject(obj, "state", s_scan_state == 1 ? "running" : (s_scan_state == 2 ? "done" : "idle"));
    cJSON *arr = cJSON_AddArrayToObject(obj, "networks");
    if (!arr || s_scan_state != 2 || !s_scan_mx) return;
    xSemaphoreTake(s_scan_mx, portMAX_DELAY);
    for (uint16_t i = 0; i < s_scan_count && s_scan; ++i) {
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddStringToObject(o, "ssid", (const char *)s_scan[i].ssid);
        cJSON_AddNumberToObject(o, "rssi", s_scan[i].rssi);
        cJSON_AddNumberToObject(o, "channel", s_scan[i].primary);
        cJSON_AddStringToObject(o, "auth", auth_name(s_scan[i].authmode));
        char bssid[18];
        snprintf(bssid, sizeof(bssid), MACSTR, MAC2STR(s_scan[i].bssid));
        cJSON_AddStringToObject(o, "bssid", bssid);
        cJSON_AddItemToArray(arr, o);
    }
    xSemaphoreGive(s_scan_mx);
}
