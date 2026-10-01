#include "lab_config.h"
#include "esp_check.h"
#include "esp_log.h"
#include "esp_random.h"
#include "driver/gpio.h"
#include "nvs.h"
#include <stdio.h>
#include <string.h>

static const char *TAG = "config";
lab_config_t g_lab_cfg;

static void random_secret(char *out, size_t cap, const char *prefix, size_t random_chars)
{
    static const char alphabet[] = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    size_t o = 0;
    if (!out || cap == 0) return;
    if (prefix) {
        while (*prefix && o + 1 < cap) out[o++] = *prefix++;
    }
    for (size_t i = 0; i < random_chars && o + 1 < cap; ++i) {
        /* esp_random() est un vrai RNG matériel lorsque le Wi-Fi/BT est actif ;
         * le rejet évite le biais modulo. */
        uint32_t r;
        do { r = esp_random() & 0xFF; } while (r >= 232); /* 232 = 4 * 58 */
        out[o++] = alphabet[r % (sizeof(alphabet) - 1)];
    }
    out[o] = 0;
}

static void defaults(lab_config_t *c)
{
    memset(c, 0, sizeof(*c));
    strlcpy(c->ap_ssid, DEFAULT_AP_SSID, sizeof(c->ap_ssid));
    c->ap_channel = DEFAULT_AP_CHANNEL;
    strlcpy(c->hostname, DEFAULT_HOSTNAME, sizeof(c->hostname));
    strlcpy(c->ai_model, DEFAULT_AI_MODEL, sizeof(c->ai_model));
    strlcpy(c->ntp_server, DEFAULT_NTP_SERVER, sizeof(c->ntp_server));
    strlcpy(c->timezone, DEFAULT_TIMEZONE, sizeof(c->timezone));
    c->auto_updates = false;
    c->espnow_enabled = false;
    c->captive_portal = true;
    c->rgb_gpio = RGB_GPIO_YD_ESP32_23;
    strlcpy(c->board_variant, "YD-ESP32-23", sizeof(c->board_variant));
    c->dht_gpio = DEFAULT_DHT_GPIO;
    c->dht_type = DEFAULT_DHT_TYPE;
}

/* Lit une chaîne NVS ; si la clé est absente ou trop longue, la valeur par défaut est conservée. */
static void getstr(nvs_handle_t h, const char *key, char *out, size_t n)
{
    char tmp[256];
    size_t len = sizeof(tmp);
    if (nvs_get_str(h, key, tmp, &len) == ESP_OK) strlcpy(out, tmp, n);
}

void lab_config_load(lab_config_t *cfg)
{
    defaults(cfg);
    bool generated = false;
    nvs_handle_t h;
    if (nvs_open("labcfg", NVS_READONLY, &h) == ESP_OK) {
        getstr(h, "ap_ssid", cfg->ap_ssid, sizeof(cfg->ap_ssid));
        getstr(h, "ap_pass", cfg->ap_pass, sizeof(cfg->ap_pass));
        getstr(h, "sta_ssid", cfg->sta_ssid, sizeof(cfg->sta_ssid));
        getstr(h, "sta_pass", cfg->sta_pass, sizeof(cfg->sta_pass));
        getstr(h, "hostname", cfg->hostname, sizeof(cfg->hostname));
        getstr(h, "admin_pass", cfg->admin_pass, sizeof(cfg->admin_pass));
        getstr(h, "control", cfg->control_path, sizeof(cfg->control_path));
        getstr(h, "wa_phone", cfg->whatsapp_phone, sizeof(cfg->whatsapp_phone));
        getstr(h, "wa_api", cfg->whatsapp_api, sizeof(cfg->whatsapp_api));
        getstr(h, "webhook", cfg->webhook_url, sizeof(cfg->webhook_url));
        getstr(h, "ai_ep", cfg->ai_endpoint, sizeof(cfg->ai_endpoint));
        getstr(h, "ai_key", cfg->ai_key, sizeof(cfg->ai_key));
        getstr(h, "ai_model", cfg->ai_model, sizeof(cfg->ai_model));
        getstr(h, "search_ep", cfg->search_endpoint, sizeof(cfg->search_endpoint));
        getstr(h, "manifest", cfg->update_manifest, sizeof(cfg->update_manifest));
        getstr(h, "gh_repo", cfg->github_repo, sizeof(cfg->github_repo));
        getstr(h, "ntp", cfg->ntp_server, sizeof(cfg->ntp_server));
        getstr(h, "tz", cfg->timezone, sizeof(cfg->timezone));
        getstr(h, "variant", cfg->board_variant, sizeof(cfg->board_variant));
        uint8_t b;
        if (nvs_get_u8(h, "auto", &b) == ESP_OK) cfg->auto_updates = b != 0;
        if (nvs_get_u8(h, "espnow", &b) == ESP_OK) cfg->espnow_enabled = b != 0;
        if (nvs_get_u8(h, "captive", &b) == ESP_OK) cfg->captive_portal = b != 0;
        if (nvs_get_u8(h, "ap_ch", &b) == ESP_OK && b >= 1 && b <= 13) cfg->ap_channel = b;
        if (nvs_get_u8(h, "dht_type", &b) == ESP_OK && (b == 11 || b == 22)) cfg->dht_type = b;
        int32_t v;
        if (nvs_get_i32(h, "rgb_gpio", &v) == ESP_OK) cfg->rgb_gpio = (int)v;
        if (nvs_get_i32(h, "dht_gpio", &v) == ESP_OK) cfg->dht_gpio = (int)v;
        nvs_close(h);
    }

    /* Migration des anciennes variantes : la carte YD-ESP32-23 utilise la LED RGB sur GPIO48. */
    if (!cfg->board_variant[0] || strcmp(cfg->board_variant, "DEVKITC1_V1_1") == 0) {
        /* v5.2 migrait déjà DEVKITC1_V1_1 -> YD-ESP32-23 ; on conserve ce comportement. */
        strlcpy(cfg->board_variant, "YD-ESP32-23", sizeof(cfg->board_variant));
        cfg->rgb_gpio = RGB_GPIO_YD_ESP32_23;
    }
    if (!cfg->hostname[0]) strlcpy(cfg->hostname, DEFAULT_HOSTNAME, sizeof(cfg->hostname));
    if (!cfg->ntp_server[0]) strlcpy(cfg->ntp_server, DEFAULT_NTP_SERVER, sizeof(cfg->ntp_server));
    if (!cfg->timezone[0]) strlcpy(cfg->timezone, DEFAULT_TIMEZONE, sizeof(cfg->timezone));
    if (!cfg->ai_model[0]) strlcpy(cfg->ai_model, DEFAULT_AI_MODEL, sizeof(cfg->ai_model));

    if (strlen(cfg->ap_pass) < 8) {
        strlcpy(cfg->ap_pass, DEFAULT_AP_PASSWORD, sizeof(cfg->ap_pass));
        generated = true;
    }
    if (!cfg->admin_pass[0]) {
        random_secret(cfg->admin_pass, sizeof(cfg->admin_pass), "ADM-", 16);
        generated = true;
    }
    if (!cfg->control_path[0] || cfg->control_path[0] != '/') {
        char token[24];
        random_secret(token, sizeof(token), "", 12);
        snprintf(cfg->control_path, sizeof(cfg->control_path), "/x-control-%s", token);
        generated = true;
    }
    g_lab_cfg = *cfg;

    if (generated) {
        if (lab_config_save(cfg) == ESP_OK) {
            ESP_LOGW(TAG, "================ PREMIER DEMARRAGE ================");
            lab_config_print_credentials();
            ESP_LOGW(TAG, "Notez ces identifiants. Maintenez BOOT 3 s pour les réafficher.");
            ESP_LOGW(TAG, "===================================================");
        }
    }
    ESP_LOGI(TAG, "configuration: AP=%s canal=%u variante=%s RGB=%d DHT%u@%d",
             cfg->ap_ssid, cfg->ap_channel, cfg->board_variant, cfg->rgb_gpio,
             (unsigned)cfg->dht_type, cfg->dht_gpio);
}

void lab_config_print_credentials(void)
{
    ESP_LOGW(TAG, "Wi-Fi AP      : %s", g_lab_cfg.ap_ssid);
    ESP_LOGW(TAG, "Mot de passe  : %s", g_lab_cfg.ap_pass);
    ESP_LOGW(TAG, "Dashboard     : http://" AP_IP_STR "/  ou  http://%s.local/", g_lab_cfg.hostname);
    ESP_LOGW(TAG, "Accès admin   : http://" AP_IP_STR "%s", g_lab_cfg.control_path);
    ESP_LOGW(TAG, "Mot de passe admin : %s", g_lab_cfg.admin_pass);
}

static bool gpio_output_ok(int gpio)
{
    if (gpio < 0) return true; /* désactivé */
    return GPIO_IS_VALID_OUTPUT_GPIO(gpio) && gpio != SD_CS_GPIO && gpio != SD_MOSI_GPIO &&
           gpio != SD_SCK_GPIO && gpio != SD_MISO_GPIO && gpio != 19 && gpio != 20 &&
           !(gpio >= 26 && gpio <= 37);
}

static bool printable_ascii(const char *s)
{
    for (; s && *s; ++s) if ((unsigned char)*s < 0x20 || (unsigned char)*s == 0x7F) return false;
    return true;
}

const char *lab_config_validate(const lab_config_t *cfg)
{
    if (!cfg) return "configuration absente";
    size_t ssid_len = strlen(cfg->ap_ssid);
    size_t ap_pass_len = strlen(cfg->ap_pass);
    if (ssid_len == 0 || ssid_len > 32) return "SSID du point d'accès : 1 à 32 caractères";
    if (ap_pass_len < 8 || ap_pass_len > 63) return "mot de passe Wi-Fi du point d'accès : 8 à 63 caractères";
    if (cfg->ap_channel < 1 || cfg->ap_channel > 13) return "canal Wi-Fi : 1 à 13";
    if (strlen(cfg->admin_pass) < 8) return "mot de passe admin : 8 caractères minimum";
    if (cfg->control_path[0] != '/' || strlen(cfg->control_path) < 8) return "chemin de contrôle invalide";
    if (!printable_ascii(cfg->ap_ssid) || !printable_ascii(cfg->ap_pass) || !printable_ascii(cfg->admin_pass))
        return "caractères de contrôle interdits";
    for (const char *p = cfg->hostname; *p; ++p) {
        if (!((*p >= 'a' && *p <= 'z') || (*p >= '0' && *p <= '9') || *p == '-'))
            return "nom d'hôte : minuscules, chiffres et tirets uniquement";
    }
    if (!cfg->hostname[0]) return "nom d'hôte vide";
    if (!gpio_output_ok(cfg->rgb_gpio)) return "GPIO de la LED RGB invalide ou réservé";
    if (!gpio_output_ok(cfg->dht_gpio)) return "GPIO du DHT invalide ou réservé";
    if (cfg->dht_gpio >= 0 && cfg->dht_gpio == cfg->rgb_gpio) return "DHT et LED RGB sur le même GPIO";
    if (cfg->dht_type != 11 && cfg->dht_type != 22) return "type DHT : 11 ou 22";
    const char *urls[] = {cfg->webhook_url, cfg->ai_endpoint, cfg->search_endpoint, cfg->update_manifest};
    for (size_t i = 0; i < sizeof(urls) / sizeof(urls[0]); ++i) {
        if (urls[i][0] && strncmp(urls[i], "https://", 8) != 0 && strncmp(urls[i], "http://", 7) != 0)
            return "les URL doivent commencer par http:// ou https://";
    }
    if (cfg->update_manifest[0] && strncmp(cfg->update_manifest, "https://", 8) != 0)
        return "le manifeste de mise à jour doit être en https://";
    if (cfg->github_repo[0]) {
        const char *slash = strchr(cfg->github_repo, '/');
        if (strncmp(cfg->github_repo, "http", 4) == 0 || !slash || slash == cfg->github_repo || !slash[1] || strchr(slash + 1, '/'))
            return "dépôt GitHub attendu au format « utilisateur/depot » (ex. Prince223889/ESP32-box)";
    }
    return NULL;
}

esp_err_t lab_config_save(const lab_config_t *cfg)
{
    if (lab_config_validate(cfg) != NULL) return ESP_ERR_INVALID_ARG;

    nvs_handle_t h;
    ESP_RETURN_ON_ERROR(nvs_open("labcfg", NVS_READWRITE, &h), TAG, "nvs_open");
    esp_err_t ret = ESP_OK;
#define PUTS(k, v) do { if (ret == ESP_OK) ret = nvs_set_str(h, k, v); } while (0)
#define PUTU8(k, v) do { if (ret == ESP_OK) ret = nvs_set_u8(h, k, (uint8_t)(v)); } while (0)
#define PUTI32(k, v) do { if (ret == ESP_OK) ret = nvs_set_i32(h, k, (int32_t)(v)); } while (0)
    PUTS("ap_ssid", cfg->ap_ssid);        PUTS("ap_pass", cfg->ap_pass);
    PUTS("sta_ssid", cfg->sta_ssid);      PUTS("sta_pass", cfg->sta_pass);
    PUTS("hostname", cfg->hostname);
    PUTS("admin_pass", cfg->admin_pass);  PUTS("control", cfg->control_path);
    PUTS("wa_phone", cfg->whatsapp_phone); PUTS("wa_api", cfg->whatsapp_api);
    PUTS("webhook", cfg->webhook_url);
    PUTS("ai_ep", cfg->ai_endpoint);      PUTS("ai_key", cfg->ai_key);
    PUTS("ai_model", cfg->ai_model);      PUTS("search_ep", cfg->search_endpoint);
    PUTS("manifest", cfg->update_manifest);
    PUTS("gh_repo", cfg->github_repo);
    PUTS("ntp", cfg->ntp_server);         PUTS("tz", cfg->timezone);
    PUTS("variant", cfg->board_variant);
    PUTU8("auto", cfg->auto_updates ? 1 : 0);
    PUTU8("espnow", cfg->espnow_enabled ? 1 : 0);
    PUTU8("captive", cfg->captive_portal ? 1 : 0);
    PUTU8("ap_ch", cfg->ap_channel);
    PUTU8("dht_type", cfg->dht_type);
    PUTI32("rgb_gpio", cfg->rgb_gpio);
    PUTI32("dht_gpio", cfg->dht_gpio);
#undef PUTS
#undef PUTU8
#undef PUTI32
    if (ret == ESP_OK) ret = nvs_commit(h);
    nvs_close(h);
    if (ret == ESP_OK) g_lab_cfg = *cfg;
    else ESP_LOGE(TAG, "sauvegarde NVS: %s", esp_err_to_name(ret));
    return ret;
}

esp_err_t lab_config_factory_reset(void)
{
    nvs_handle_t h;
    ESP_RETURN_ON_ERROR(nvs_open("labcfg", NVS_READWRITE, &h), TAG, "nvs_open");
    esp_err_t r = nvs_erase_all(h);
    if (r == ESP_OK) r = nvs_commit(h);
    nvs_close(h);
    return r;
}
