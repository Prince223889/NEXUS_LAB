#include "storage.h"
#include "lab_config.h"
#include "driver/spi_master.h"
#include "driver/gpio.h"
#include "driver/sdspi_host.h"
#include "sdmmc_cmd.h"
#include "esp_vfs_fat.h"
#include "event_log.h"
#include "esp_log.h"
#include "psa/crypto.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

static const char *TAG = "storage";
static bool s_ready = false;
static sdmmc_card_t *s_card = NULL;

const char *storage_root(void) { return "/sd"; }
bool storage_ready(void) { return s_ready; }

bool storage_name_valid(const char *name)
{
    if (!name || !*name || strlen(name) > 96 || strcmp(name, ".") == 0 || strcmp(name, "..") == 0) return false;
    for (const unsigned char *p = (const unsigned char *)name; *p; ++p) {
        if (!isalnum(*p) && *p != '-' && *p != '_' && *p != '.' && *p != ' ' && *p != '+' && *p != '(' && *p != ')')
            return false;
    }
    return name[0] != ' ' && name[strlen(name) - 1] != ' ' && name[strlen(name) - 1] != '.';
}

bool storage_path_valid(const char *p, bool allow_root)
{
    if (!p || strncmp(p, "/sd", 3) != 0) return false;
    size_t n = strlen(p);
    if (n >= 240) return false;
    if (n == 3) return allow_root;
    if (p[3] != '/') return false;
    if (strstr(p, "..") || strstr(p, "//") || strchr(p, '\\')) return false;
    for (const unsigned char *c = (const unsigned char *)p; *c; ++c) {
        if (*c < 0x20 || *c == 0x7F || *c == ':' || *c == '*' || *c == '?' || *c == '"' || *c == '<' ||
            *c == '>' || *c == '|')
            return false;
    }
    return p[n - 1] != '/';
}

static void mk(const char *p)
{
    if (mkdir(p, 0775) != 0 && errno != EEXIST) ESP_LOGW(TAG, "mkdir %s: %d", p, errno);
}

static void write_if_missing(const char *p, const char *t)
{
    if (access(p, F_OK) != 0) (void)storage_write_text(p, t);
}

static void storage_import_once(void)
{
    if (!s_ready) return;
    const char *inbox = "/sd/INBOX";
    const char *imported = "/sd/PROJECTS/IMPORTED";
    mk(imported);
    DIR *d = opendir(inbox);
    if (!d) return;
    struct dirent *e;
    while ((e = readdir(d))) {
        if (e->d_type != DT_DIR || !storage_name_valid(e->d_name)) continue;
        char src[MAX_PROJECT_PATH_BYTES], dst[MAX_PROJECT_PATH_BYTES];
        int w = snprintf(src, sizeof(src), "%s/%s", inbox, e->d_name);
        if (w < 0 || (size_t)w >= sizeof(src)) continue;
        w = snprintf(dst, sizeof(dst), "%s/%s", imported, e->d_name);
        if (w < 0 || (size_t)w >= sizeof(dst)) continue;
        if (access(dst, F_OK) == 0) {
            bool found = false;
            for (unsigned n = 2; n < 1000; n++) {
                w = snprintf(dst, sizeof(dst), "%s/%s_%u", imported, e->d_name, n);
                if (w < 0 || (size_t)w >= sizeof(dst)) break;
                if (access(dst, F_OK) != 0) { found = true; break; }
            }
            if (!found) continue;
        }
        if (rename(src, dst) == 0) ESP_LOGI(TAG, "projet importé : %s", dst);
        else ESP_LOGW(TAG, "import impossible : %s -> %s (%d)", src, dst, errno);
    }
    closedir(d);
}

static void importer_task(void *arg)
{
    (void)arg;
    for (;;) {
        storage_import_once();
        vTaskDelay(pdMS_TO_TICKS(STORAGE_IMPORT_INTERVAL_MS));
    }
}

/* Explication en clair des erreurs d'initialisation de la carte (affichée une seule fois). */
static const char *sd_hint(esp_err_t r)
{
    switch (r) {
    case ESP_ERR_TIMEOUT:
        return "la carte ne répond pas : alimentation (module avec régulateur AMS1117 = VCC sur 5V), fil CS (GPIO10) ou MISO (GPIO13), carte bien enfoncée";
    case ESP_ERR_INVALID_RESPONSE:
    case ESP_ERR_INVALID_CRC:
        return "réponse illisible : MOSI/MISO inversés (DI=MOSI=GPIO11, DO=MISO=GPIO13), fils trop longs, masse commune";
    case ESP_FAIL:
        return "carte lue mais pas de système de fichiers FAT32 : formatez-la en FAT32 (exFAT non supporté)";
    default:
        return "vérifiez le câblage et le format FAT32";
    }
}


/* Une tentative de montage ; essaie trois vitesses (câbles longs ou modules lents). */
static esp_err_t sd_try_mount(bool verbose)
{
    static const int freqs_khz[] = {SDMMC_FREQ_DEFAULT, 4000, 1000};
    esp_err_t r = ESP_FAIL;
    for (size_t i = 0; i < sizeof(freqs_khz) / sizeof(freqs_khz[0]); i++) {
        sdmmc_host_t host = SDSPI_HOST_DEFAULT();
        host.slot = SPI2_HOST;
        host.max_freq_khz = freqs_khz[i];
        sdspi_device_config_t slot = SDSPI_DEVICE_CONFIG_DEFAULT();
        slot.gpio_cs = SD_CS_GPIO;
        slot.host_id = SPI2_HOST;
        esp_vfs_fat_mount_config_t m = {
            .format_if_mount_failed = false,
            .max_files = 12,
            .allocation_unit_size = 16 * 1024,
        };
        r = esp_vfs_fat_sdspi_mount("/sd", &host, &slot, &m, &s_card);
        if (r == ESP_OK) {
            if (freqs_khz[i] != SDMMC_FREQ_DEFAULT) ESP_LOGW(TAG, "microSD montée à vitesse réduite (%d kHz) : raccourcissez les fils", freqs_khz[i]);
            return ESP_OK;
        }
        if (r == ESP_FAIL) break; /* carte lue mais non FAT : inutile de ralentir */
    }
    if (verbose) ESP_LOGW(TAG, "microSD non montée (%s) : %s", esp_err_to_name(r), sd_hint(r));
    return r;
}

static void sd_mounted(void)
{
    s_ready = true;
    ESP_LOGI(TAG, "microSD montée : %s, %llu Mo", s_card->cid.name,
             (unsigned long long)(((uint64_t)s_card->csd.capacity) * s_card->csd.sector_size / (1024 * 1024)));
    storage_prepare_tree();
    storage_import_once();
    xTaskCreate(importer_task, "sd_import", 3584, NULL, 2, NULL);
}

/* Carte absente au démarrage : nouvel essai toutes les 20 s, pour corriger le câblage sans redémarrer. */
static void sd_retry_task(void *arg)
{
    (void)arg;
    while (!s_ready) {
        vTaskDelay(pdMS_TO_TICKS(20000));
        if (sd_try_mount(false) == ESP_OK) {
            sd_mounted();
            evlog_add('S', "storage", "microSD détectée et montée");
        }
    }
    vTaskDelete(NULL);
}

void storage_init(void)
{
    /* Tirages internes : une carte SD exige MISO et CS au niveau haut au repos. */
    gpio_set_pull_mode(SD_MISO_GPIO, GPIO_PULLUP_ONLY);
    gpio_set_pull_mode(SD_MOSI_GPIO, GPIO_PULLUP_ONLY);
    gpio_set_pull_mode(SD_CS_GPIO, GPIO_PULLUP_ONLY);
    spi_bus_config_t bus = {
        .mosi_io_num = SD_MOSI_GPIO,
        .miso_io_num = SD_MISO_GPIO,
        .sclk_io_num = SD_SCK_GPIO,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1,
        .max_transfer_sz = 4096,
    };
    esp_err_t r = spi_bus_initialize(SPI2_HOST, &bus, SPI_DMA_CH_AUTO);
    if (r != ESP_OK) {
        ESP_LOGE(TAG, "bus SPI: %s", esp_err_to_name(r));
        return;
    }
    if (sd_try_mount(true) == ESP_OK) {
        sd_mounted();
        return;
    }
    /* Le MASTER continue sans SD et réessaie en arrière-plan. */
    xTaskCreate(sd_retry_task, "sd_retry", 4096, NULL, 2, NULL);
}

esp_err_t storage_prepare_tree(void)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    const char *d[] = {
        "/sd/FIRMWARE", "/sd/FIRMWARE/MASTER", "/sd/FIRMWARE/WORKER", "/sd/FIRMWARE/ESP32", "/sd/FIRMWARE/ESP32S3",
        "/sd/FIRMWARE/AVR", "/sd/FIRMWARE/AVR/UNO", "/sd/FIRMWARE/AVR/NANO",
        "/sd/PROJECTS", "/sd/PROJECTS/LIBRARY", "/sd/PROJECTS/IMPORTED", "/sd/PROJECTS/MY_PROJECTS",
        "/sd/INBOX", "/sd/COMPONENTS", "/sd/LIBRARIES", "/sd/TESTS", "/sd/REPORTS", "/sd/LOGS", "/sd/BACKUPS",
        "/sd/CONFIG", "/sd/DATABASE", "/sd/UPDATES", "/sd/AI"};
    for (size_t i = 0; i < sizeof(d) / sizeof(d[0]); ++i) mk(d[i]);
    write_if_missing("/sd/CONFIG/README.txt",
                     "ESP32 LAB : configuration locale. Les secrets restent dans la NVS du MASTER, jamais sur la carte.\n");
    write_if_missing("/sd/INBOX/README.txt",
                     "Deposez ici un dossier de projet ; il sera deplace automatiquement vers /sd/PROJECTS/IMPORTED.\n");
    write_if_missing("/sd/FIRMWARE/README.txt",
                     "Binaires .bin (ESP32) et .hex (AVR) utilisables depuis le dashboard.\n");
    return ESP_OK;
}

esp_err_t storage_mkdir(const char *p)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    if (!storage_path_valid(p, false)) return ESP_ERR_INVALID_ARG;
    if (mkdir(p, 0775) == 0 || errno == EEXIST) return ESP_OK;
    return ESP_FAIL;
}

esp_err_t storage_import_inbox(void)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    storage_import_once();
    return ESP_OK;
}

esp_err_t storage_write_text(const char *p, const char *t)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    if (!storage_path_valid(p, false) || !t) return ESP_ERR_INVALID_ARG;
    FILE *f = fopen(p, "w");
    if (!f) return ESP_FAIL;
    size_t n = strlen(t);
    size_t w = fwrite(t, 1, n, f);
    fclose(f);
    return w == n ? ESP_OK : ESP_FAIL;
}

esp_err_t storage_append_text(const char *p, const char *t)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    if (!storage_path_valid(p, false) || !t) return ESP_ERR_INVALID_ARG;
    FILE *f = fopen(p, "a");
    if (!f) return ESP_FAIL;
    size_t n = strlen(t);
    size_t w = fwrite(t, 1, n, f);
    fclose(f);
    return w == n ? ESP_OK : ESP_FAIL;
}

esp_err_t storage_delete(const char *p)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    if (!storage_path_valid(p, false)) return ESP_ERR_INVALID_ARG;
    struct stat st;
    if (stat(p, &st) != 0) return ESP_ERR_NOT_FOUND;
    if (S_ISDIR(st.st_mode)) return rmdir(p) == 0 ? ESP_OK : ESP_ERR_INVALID_STATE; /* dossier non vide */
    return unlink(p) == 0 ? ESP_OK : ESP_FAIL;
}

esp_err_t storage_rename(const char *from, const char *to)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    if (!storage_path_valid(from, false) || !storage_path_valid(to, false)) return ESP_ERR_INVALID_ARG;
    if (access(to, F_OK) == 0) return ESP_ERR_INVALID_STATE;
    return rename(from, to) == 0 ? ESP_OK : ESP_FAIL;
}

esp_err_t storage_usage(uint64_t *total_bytes, uint64_t *free_bytes)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    return esp_vfs_fat_info("/sd", total_bytes, free_bytes);
}

esp_err_t storage_list_json(const char *dir, cJSON *arr, int max_items)
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    if (!arr || !storage_path_valid(dir, true)) return ESP_ERR_INVALID_ARG;
    DIR *d = opendir(dir);
    if (!d) return ESP_ERR_NOT_FOUND;
    struct dirent *e;
    int count = 0;
    char full[MAX_PROJECT_PATH_BYTES];
    while ((e = readdir(d)) && count < max_items) {
        if (!strcmp(e->d_name, ".") || !strcmp(e->d_name, "..")) continue;
        cJSON *o = cJSON_CreateObject();
        if (!o) break;
        cJSON_AddStringToObject(o, "name", e->d_name);
        cJSON_AddStringToObject(o, "type", e->d_type == DT_DIR ? "d" : "f");
        int w = snprintf(full, sizeof(full), "%s/%s", dir, e->d_name);
        struct stat st;
        if (w > 0 && (size_t)w < sizeof(full) && stat(full, &st) == 0) {
            cJSON_AddNumberToObject(o, "size", (double)st.st_size);
            cJSON_AddNumberToObject(o, "mtime", (double)st.st_mtime);
        }
        cJSON_AddItemToArray(arr, o);
        count++;
    }
    closedir(d);
    return ESP_OK;
}

esp_err_t storage_sha256_file(const char *p, char hex[65])
{
    if (!s_ready) return ESP_ERR_INVALID_STATE;
    if (!storage_path_valid(p, false) || !hex) return ESP_ERR_INVALID_ARG;
    FILE *f = fopen(p, "rb");
    if (!f) return ESP_ERR_NOT_FOUND;
    psa_status_t st = psa_crypto_init();
    if (st != PSA_SUCCESS) { fclose(f); return ESP_FAIL; }
    psa_hash_operation_t op = PSA_HASH_OPERATION_INIT;
    st = psa_hash_setup(&op, PSA_ALG_SHA_256);
    if (st != PSA_SUCCESS) { fclose(f); return ESP_FAIL; }
    uint8_t *b = malloc(4096);
    if (!b) { psa_hash_abort(&op); fclose(f); return ESP_ERR_NO_MEM; }
    size_t n;
    while ((n = fread(b, 1, 4096, f)) > 0) {
        st = psa_hash_update(&op, b, n);
        if (st != PSA_SUCCESS) break;
    }
    free(b);
    fclose(f);
    uint8_t d[32];
    size_t out_len = 0;
    if (st == PSA_SUCCESS) st = psa_hash_finish(&op, d, sizeof(d), &out_len);
    else (void)psa_hash_abort(&op);
    if (st != PSA_SUCCESS || out_len != sizeof(d)) return ESP_FAIL;
    static const char h[] = "0123456789abcdef";
    for (int i = 0; i < 32; i++) {
        hex[i * 2] = h[d[i] >> 4];
        hex[i * 2 + 1] = h[d[i] & 15];
    }
    hex[64] = 0;
    return ESP_OK;
}
