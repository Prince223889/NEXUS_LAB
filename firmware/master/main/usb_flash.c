/* Programmation par câble USB en tâche de fond (Arduino .hex et ESP32 .bin) — voir usb_flash.h.
 * Le protocole ESP32 est celui du bootloader ROM documenté par Espressif (esptool, « serial protocol ») :
 * trames SLIP, SYNC, détection de la puce, SPI_ATTACH, SPI_SET_PARAMS, FLASH_BEGIN/FLASH_DATA par blocs
 * de 1 Ko, vérification SPI_FLASH_MD5, puis reset matériel par les lignes DTR/RTS. */
#include "usb_flash.h"
#include "usb_avr.h"
#include "event_log.h"
#include "led_status.h"
#include "esp_log.h"
#include "esp_rom_md5.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include <ctype.h>
#include <dirent.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>

static const char *TAG = "usb_flash";

/* ======================= état + journal ======================= */

#define LOG_LINES 64
typedef struct {
    uint32_t seq;
    char text[112];
} log_line_t;

static SemaphoreHandle_t s_mx;
static log_line_t s_log[LOG_LINES];
static uint32_t s_log_seq;
static volatile bool s_busy;
static volatile int s_pct;
static int s_ok = -1; /* -1 en cours / inconnu, 0 échec, 1 réussi */
static char s_kind[8] = "";
static char s_file[160] = "";
static char s_step[64] = "";
static char s_result[160] = "";
static char s_chip[16] = "";
static uint32_t s_run_baud;
/* Identification de la carte branchée (indépendante du journal de flash). */
static volatile bool s_det_busy;
static uint32_t s_det_seq;
static char s_det_board[12] = "";
static char s_det_profile[24] = "";
static char s_det_text[160] = "";

static void lock(void)
{
    if (!s_mx) s_mx = xSemaphoreCreateMutex();
    xSemaphoreTake(s_mx, portMAX_DELAY);
}
static void unlock(void) { xSemaphoreGive(s_mx); }
static int64_t now_ms(void) { return esp_timer_get_time() / 1000; }

static void flog(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
static void flog(const char *fmt, ...)
{
    char line[112];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(line, sizeof(line), fmt, ap);
    va_end(ap);
    lock();
    log_line_t *l = &s_log[s_log_seq % LOG_LINES];
    l->seq = ++s_log_seq;
    strlcpy(l->text, line, sizeof(l->text));
    unlock();
    ESP_LOGI(TAG, "%s", line);
}

static void set_step(int pct, const char *step)
{
    bool changed;
    lock();
    if (pct >= 0) s_pct = pct;
    changed = step && strcmp(step, s_step) != 0;
    if (changed) strlcpy(s_step, step, sizeof(s_step));
    unlock();
    if (changed) flog("» %s", step);
}

static void finish(bool ok, const char *fmt, ...) __attribute__((format(printf, 2, 3)));
static void finish(bool ok, const char *fmt, ...)
{
    char msg[160];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(msg, sizeof(msg), fmt, ap);
    va_end(ap);
    lock();
    s_ok = ok ? 1 : 0;
    if (ok) s_pct = 100;
    strlcpy(s_result, msg, sizeof(s_result));
    strlcpy(s_step, ok ? "terminé" : "échec", sizeof(s_step));
    unlock();
    flog("%s %s", ok ? "✔" : "✘", msg);
    evlog_add(ok ? 'S' : 'E', "usb", "flash %s : %s", s_kind, msg);
}

bool usb_flash_busy(void) { return s_busy || s_det_busy; }

void usb_flash_status_json(cJSON *obj, uint32_t since)
{
    if (!obj) return;
    lock();
    cJSON_AddBoolToObject(obj, "busy", s_busy);
    cJSON_AddStringToObject(obj, "kind", s_kind);
    cJSON_AddStringToObject(obj, "file", s_file);
    cJSON_AddStringToObject(obj, "step", s_step);
    cJSON_AddNumberToObject(obj, "progress", s_pct);
    if (s_ok < 0) cJSON_AddNullToObject(obj, "ok");
    else cJSON_AddBoolToObject(obj, "ok", s_ok == 1);
    cJSON_AddStringToObject(obj, "result", s_result);
    cJSON_AddStringToObject(obj, "chip", s_chip);
    cJSON_AddNumberToObject(obj, "baud", s_run_baud);
    cJSON_AddNumberToObject(obj, "last", s_log_seq);
    cJSON *arr = cJSON_AddArrayToObject(obj, "log");
    uint32_t first = s_log_seq > LOG_LINES ? s_log_seq - LOG_LINES + 1 : 1;
    if (since + 1 > first) first = since + 1;
    for (uint32_t q = first; q <= s_log_seq; q++) {
        log_line_t *l = &s_log[q % LOG_LINES];
        if (l->seq != q) continue;
        cJSON *o = cJSON_CreateObject();
        cJSON_AddNumberToObject(o, "seq", q);
        cJSON_AddStringToObject(o, "text", l->text);
        cJSON_AddItemToArray(arr, o);
    }
    unlock();
}

static void job_reset(const char *kind, const char *path)
{
    lock();
    memset(s_log, 0, sizeof(s_log));
    s_ok = -1;
    s_pct = 0;
    s_step[0] = s_result[0] = s_chip[0] = 0;
    s_run_baud = 0;
    strlcpy(s_kind, kind, sizeof(s_kind));
    strlcpy(s_file, path, sizeof(s_file));
    unlock();
}

/* Vitesse du moniteur à utiliser après le flash : Serial.begin(N) lu dans le .ino du projet. */
static uint32_t guess_baud(const char *path, uint32_t fallback)
{
    char dirs[3][160];
    strlcpy(dirs[0], path, sizeof(dirs[0]));
    for (int d = 0; d < 3; d++) {
        char *slash = strrchr(dirs[d], '/');
        if (!slash) return fallback;
        *slash = 0;                                 /* dossier du fichier, puis parent, puis grand-parent */
        if (d < 2) strlcpy(dirs[d + 1], dirs[d], sizeof(dirs[d + 1]));
        DIR *dir = opendir(dirs[d]);
        if (!dir) continue;
        struct dirent *e;
        uint32_t found = 0;
        while (!found && (e = readdir(dir))) {
            size_t n = strlen(e->d_name);
            if (n < 5 || strcasecmp(e->d_name + n - 4, ".ino")) continue;
            char p[420];
            snprintf(p, sizeof(p), "%s/%s", dirs[d], e->d_name);
            FILE *f = fopen(p, "r");
            if (!f) continue;
            char line[200];
            while (!found && fgets(line, sizeof(line), f)) {
                char *s = strstr(line, "Serial.begin(");
                if (s) found = (uint32_t)strtoul(s + 13, NULL, 10);
            }
            fclose(f);
        }
        closedir(dir);
        if (found >= 300 && found <= 2000000) return found;
    }
    return fallback;
}

/* ======================= Arduino (.hex) ======================= */

typedef struct {
    char path[160];
    char profile[32];
} job_t;

static void avr_progress(int pct, const char *step) { set_step(pct, step); }

static void avr_task(void *arg)
{
    job_t *j = (job_t *)arg;
    char result[160];
    flog("Programmation Arduino : %s", j->path);
    flog("Profil : %s", j->profile);
    usb_avr_set_progress_cb(avr_progress);
    esp_err_t r = usb_avr_flash_hex(j->path, j->profile, result, sizeof(result));
    usb_avr_set_progress_cb(NULL);
    s_run_baud = guess_baud(j->path, 9600);
    if (r == ESP_OK) {
        usb_serial_set_baud(s_run_baud);
        finish(true, "%s — moniteur réglé à %lu bauds", result, (unsigned long)s_run_baud);
    } else {
        finish(false, "%s", result);
    }
    free(j);
    s_busy = false;
    vTaskDelete(NULL);
}

esp_err_t usb_flash_start_avr(const char *hex_path, const char *profile, char *err, size_t cap)
{
    if (s_busy) { snprintf(err, cap, "une programmation est déjà en cours"); return ESP_ERR_INVALID_STATE; }
    if (s_det_busy) { snprintf(err, cap, "identification de la carte en cours, réessayez dans quelques secondes"); return ESP_ERR_INVALID_STATE; }
    if (!usb_avr_ready()) { snprintf(err, cap, "aucune carte branchée sur le port USB du MASTER"); return ESP_ERR_INVALID_STATE; }
    struct stat st;
    if (stat(hex_path, &st) != 0) { snprintf(err, cap, "fichier introuvable : %s", hex_path); return ESP_ERR_NOT_FOUND; }
    job_t *j = calloc(1, sizeof(*j));
    if (!j) return ESP_ERR_NO_MEM;
    strlcpy(j->path, hex_path, sizeof(j->path));
    strlcpy(j->profile, profile && *profile ? profile : "ATmega328P_Optiboot", sizeof(j->profile));
    job_reset("avr", hex_path);
    s_busy = true;
    if (xTaskCreate(avr_task, "usb_flash", 6144, j, 5, NULL) != pdPASS) {
        s_busy = false;
        free(j);
        snprintf(err, cap, "tâche impossible à créer");
        return ESP_ERR_NO_MEM;
    }
    return ESP_OK;
}

/* ======================= ESP32 (bootloader ROM) ======================= */

#define OP_FLASH_BEGIN 0x02
#define OP_FLASH_DATA 0x03
#define OP_SYNC 0x08
#define OP_READ_REG 0x0A
#define OP_SPI_SET_PARAMS 0x0B
#define OP_SPI_ATTACH 0x0D
#define OP_CHANGE_BAUD 0x0F
#define OP_SPI_FLASH_MD5 0x13
#define OP_SECURITY_INFO 0x14
#define ESP_BLOCK 0x400            /* taille de bloc d'écriture du bootloader ROM */
#define FAST_BAUD 460800
#define MAX_PARTS 6

static uint8_t s_status_len = 2;  /* 4 pour le ROM de l'ESP32, 2 pour les autres */
static uint16_t s_last_size;
static uint8_t s_last_error;

static void put32(uint8_t *p, uint32_t v)
{
    p[0] = (uint8_t)v;
    p[1] = (uint8_t)(v >> 8);
    p[2] = (uint8_t)(v >> 16);
    p[3] = (uint8_t)(v >> 24);
}
static uint32_t get32(const uint8_t *p) { return p[0] | (p[1] << 8) | (p[2] << 16) | ((uint32_t)p[3] << 24); }

static esp_err_t slip_send(uint8_t op, const uint8_t *data, uint16_t len, uint32_t chk)
{
    uint8_t hdr[8] = {0x00, op, (uint8_t)len, (uint8_t)(len >> 8)};
    put32(hdr + 4, chk);
    size_t cap = (8 + (size_t)len) * 2 + 2, o = 0;
    uint8_t *f = malloc(cap);
    if (!f) return ESP_ERR_NO_MEM;
    f[o++] = 0xC0;
    for (size_t i = 0; i < 8 + (size_t)len; i++) {
        uint8_t b = i < 8 ? hdr[i] : data[i - 8];
        if (b == 0xC0) { f[o++] = 0xDB; f[o++] = 0xDC; }
        else if (b == 0xDB) { f[o++] = 0xDB; f[o++] = 0xDD; }
        else f[o++] = b;
    }
    f[o++] = 0xC0;
    esp_err_t r = usb_link_tx(f, o);
    free(f);
    return r;
}

/* Lit une trame SLIP complète ; renvoie sa longueur ou -1 (délai dépassé). */
static int slip_recv(uint8_t *out, size_t cap, uint32_t timeout_ms)
{
    int64_t end = now_ms() + timeout_ms;
    bool in = false, esc = false;
    size_t n = 0;
    while (now_ms() < end) {
        uint8_t b;
        int64_t left = end - now_ms();
        if (usb_link_rx(&b, 1, left > 0 ? (uint32_t)left : 1) != 1) break;
        if (!in) { if (b == 0xC0) { in = true; n = 0; } continue; }
        if (b == 0xC0) { if (n == 0) continue; return (int)n; }
        if (esc) { esc = false; b = b == 0xDC ? 0xC0 : b == 0xDD ? 0xDB : b; }
        else if (b == 0xDB) { esc = true; continue; }
        if (n < cap) out[n++] = b;
    }
    return -1;
}

static esp_err_t command(uint8_t op, const uint8_t *data, uint16_t len, uint32_t chk, uint32_t timeout_ms, uint32_t *value,
                         uint8_t *body, size_t *body_len)
{
    esp_err_t r = slip_send(op, data, len, chk);
    if (r != ESP_OK) return r;
    uint8_t resp[160];
    int64_t end = now_ms() + timeout_ms;
    while (now_ms() < end) {
        int n = slip_recv(resp, sizeof(resp), (uint32_t)(end - now_ms()));
        if (n < 0) return ESP_ERR_TIMEOUT;
        if (n < 8 || resp[0] != 0x01 || resp[1] != op) continue;   /* réponse tardive d'une autre commande */
        uint16_t size = (uint16_t)(resp[2] | (resp[3] << 8));
        if (8 + (int)size > n) return ESP_ERR_INVALID_SIZE;
        s_last_size = size;
        if (value) *value = get32(resp + 4);
        const uint8_t *d = resp + 8;
        size_t sl = size >= s_status_len ? s_status_len : size;
        if (sl >= 2 && d[size - sl] != 0) {
            s_last_error = d[size - sl + 1];
            return ESP_FAIL;
        }
        if (body && body_len) {
            size_t bl = size - sl;
            if (bl > *body_len) bl = *body_len;
            memcpy(body, d, bl);
            *body_len = bl;
        }
        return ESP_OK;
    }
    return ESP_ERR_TIMEOUT;
}

static void lines_seq(bool usb_jtag)
{
    if (usb_jtag) {  /* puce à USB natif (USB-Serial-JTAG, VID 0x303A) : séquence d'esptool */
        usb_link_set_lines(false, false);
        vTaskDelay(pdMS_TO_TICKS(100));
        usb_link_set_lines(true, false);
        vTaskDelay(pdMS_TO_TICKS(100));
        usb_link_set_lines(true, true);
        usb_link_set_lines(false, true);
        vTaskDelay(pdMS_TO_TICKS(100));
        usb_link_set_lines(false, false);
    } else {         /* pont USB-UART (CP210x, CH340…) avec le circuit d'auto-reset des DevKit */
        usb_link_set_lines(false, true);   /* EN bas : puce en reset, IO0 haut */
        vTaskDelay(pdMS_TO_TICKS(100));
        usb_link_set_lines(true, false);   /* IO0 bas, EN haut : démarrage en mode téléchargement */
        vTaskDelay(pdMS_TO_TICKS(50));
        usb_link_set_lines(false, false);  /* IO0 relâché */
    }
}

static void hard_reset(void)
{
    usb_link_set_lines(false, true);
    vTaskDelay(pdMS_TO_TICKS(120));
    usb_link_set_lines(false, false);
}

static bool sync_once(void)
{
    uint8_t payload[36] = {0x07, 0x07, 0x12, 0x20};
    memset(payload + 4, 0x55, 32);
    for (int k = 0; k < 5; k++) {
        if (command(OP_SYNC, payload, sizeof(payload), 0, 120, NULL, NULL, NULL) == ESP_OK) {
            uint8_t junk[64];
            while (slip_recv(junk, sizeof(junk), 60) >= 0) { } /* le ROM répond plusieurs fois au SYNC */
            usb_link_rx_clear();
            return true;
        }
    }
    return false;
}

static bool connect_rom(bool usb_jtag)
{
    usb_link_set_baud(115200);
    for (int attempt = 0; attempt < 8; attempt++) {
        flog("Mise en mode téléchargement (essai %d/8)…", attempt + 1);
        lines_seq(usb_jtag ^ (attempt >= 4));   /* 4 essais avec la séquence attendue, puis l'autre */
        vTaskDelay(pdMS_TO_TICKS(30));
        usb_link_rx_clear();
        if (sync_once()) return true;
    }
    return false;
}

static const char *detect_chip(void)
{
    uint32_t magic = 0;
    s_status_len = 2;
    if (command(OP_READ_REG, (const uint8_t[]){0x00, 0x10, 0x00, 0x40}, 4, 0, 500, &magic, NULL, NULL) == ESP_OK) {
        s_status_len = s_last_size >= 4 ? 4 : 2;   /* READ_REG ne renvoie que les octets d'état */
        if (magic == 0x00F01D83) return "esp32";
    }
    s_status_len = 2;
    uint8_t info[24];
    size_t il = sizeof(info);
    if (command(OP_SECURITY_INFO, NULL, 0, 0, 500, NULL, info, &il) == ESP_OK && il >= 16) {
        uint32_t id = get32(info + 12);
        if (id == 9) return "esp32s3";
        if (id == 5) return "esp32c3";
        if (id == 2) return "esp32s2";
        if (id == 13) return "esp32c6";
        if (id == 16) return "esp32h2";
    }
    if (magic == 0x9) return "esp32s3";
    if (magic == 0x6921506F || magic == 0x1B31506F || magic == 0x4881606F || magic == 0x4361606F) return "esp32c3";
    return NULL;
}

typedef struct {
    uint32_t offset;
    char path[384];
    uint32_t size;
} part_t;

/* Lit flash_args (arduino-cli) : « 0x1000 fichier.bin » par ligne ; --flash-size NMB. */
static int read_parts(const char *bin_path, part_t *parts, int max, uint32_t *flash_size, char *err, size_t cap)
{
    char dir[200], fa[240];
    strlcpy(dir, bin_path, sizeof(dir));
    char *slash = strrchr(dir, '/');
    if (!slash) { snprintf(err, cap, "chemin invalide"); return -1; }
    *slash = 0;
    snprintf(fa, sizeof(fa), "%s/flash_args", dir);
    *flash_size = 4u * 1024 * 1024;
    int n = 0;
    FILE *f = fopen(fa, "r");
    if (f) {
        char line[240];
        while (fgets(line, sizeof(line), f) && n < max) {
            char *fs = strstr(line, "--flash-size ");
            if (fs) { unsigned mb = (unsigned)strtoul(fs + 13, NULL, 10); if (mb >= 1 && mb <= 128) *flash_size = mb * 1024u * 1024u; }
            if (strncmp(line, "0x", 2) != 0) continue;
            char name[160] = "";
            unsigned long off = strtoul(line, NULL, 16);
            if (sscanf(line, "%*s %159s", name) != 1) continue;
            parts[n].offset = (uint32_t)off;
            snprintf(parts[n].path, sizeof(parts[n].path), "%s/%s", dir, name);
            n++;
        }
        fclose(f);
    }
    if (n == 0) {  /* pas de flash_args : application seule (bootloader et partitions déjà présents) */
        parts[0].offset = 0x10000;
        strlcpy(parts[0].path, bin_path, sizeof(parts[0].path));
        n = 1;
        flog("flash_args absent : seule l'application est écrite à 0x10000");
    }
    for (int i = 0; i < n; i++) {
        struct stat st;
        if (stat(parts[i].path, &st) != 0 || st.st_size <= 0) {
            snprintf(err, cap, "fichier manquant : %s", strrchr(parts[i].path, '/') ? strrchr(parts[i].path, '/') + 1 : parts[i].path);
            return -1;
        }
        parts[i].size = (uint32_t)st.st_size;
    }
    return n;
}

static const char *expected_chip(const char *path)
{
    if (strstr(path, "/esp32s3/") || strstr(path, "esp32s3__")) return "esp32s3";
    if (strstr(path, "/esp32c3/") || strstr(path, "esp32c3__")) return "esp32c3";
    if (strstr(path, "/esp32/") || strstr(path, "esp32__")) return "esp32";
    return NULL;
}

static esp_err_t write_part(const part_t *p, uint32_t *done, uint32_t total, char *err, size_t cap)
{
    FILE *f = fopen(p->path, "rb");
    if (!f) { snprintf(err, cap, "lecture impossible : %s", p->path); return ESP_FAIL; }
    uint32_t blocks = (p->size + ESP_BLOCK - 1) / ESP_BLOCK;
    uint8_t begin[20];
    put32(begin, p->size);
    put32(begin + 4, blocks);
    put32(begin + 8, ESP_BLOCK);
    put32(begin + 12, p->offset);
    put32(begin + 16, 0);  /* non chiffré (mot supplémentaire pour les ROM ESP32-S3/C3…) */
    uint16_t blen = strcmp(s_chip, "esp32") == 0 ? 16 : 20;
    uint32_t erase_timeout = 3000 + (p->size / 1024) * 40;
    const char *name = strrchr(p->path, '/') ? strrchr(p->path, '/') + 1 : p->path;
    flog("Écriture de %s (%lu octets) à 0x%05lX", name, (unsigned long)p->size, (unsigned long)p->offset);
    esp_err_t r = command(OP_FLASH_BEGIN, begin, blen, 0, erase_timeout, NULL, NULL, NULL);
    if (r != ESP_OK) { fclose(f); snprintf(err, cap, "effacement refusé à 0x%05lX (%s)", (unsigned long)p->offset, esp_err_to_name(r)); return r; }

    md5_context_t md5;
    esp_rom_md5_init(&md5);
    uint8_t *pkt = malloc(16 + ESP_BLOCK);
    if (!pkt) { fclose(f); return ESP_ERR_NO_MEM; }
    for (uint32_t seq = 0; seq < blocks && r == ESP_OK; seq++) {
        size_t n = fread(pkt + 16, 1, ESP_BLOCK, f);
        esp_rom_md5_update(&md5, pkt + 16, (uint32_t)n);
        if (n < ESP_BLOCK) memset(pkt + 16 + n, 0xFF, ESP_BLOCK - n);
        put32(pkt, ESP_BLOCK);
        put32(pkt + 4, seq);
        put32(pkt + 8, 0);
        put32(pkt + 12, 0);
        uint8_t chk = 0xEF;
        for (int i = 0; i < ESP_BLOCK; i++) chk ^= pkt[16 + i];
        for (int attempt = 0; attempt < 3; attempt++) {
            r = command(OP_FLASH_DATA, pkt, 16 + ESP_BLOCK, chk, 5000, NULL, NULL, NULL);
            if (r == ESP_OK) break;
        }
        if (r != ESP_OK) snprintf(err, cap, "bloc %lu de %s refusé (%s)", (unsigned long)seq, name, esp_err_to_name(r));
        *done += (uint32_t)n;
        set_step(5 + (int)(85ULL * *done / (total ? total : 1)), "écriture de la mémoire flash");
    }
    free(pkt);
    fclose(f);
    if (r != ESP_OK) return r;

    uint8_t digest[16];
    esp_rom_md5_final(digest, &md5);
    char local[33];
    for (int i = 0; i < 16; i++) snprintf(local + i * 2, 3, "%02x", digest[i]);
    uint8_t q[16];
    put32(q, p->offset);
    put32(q + 4, p->size);
    put32(q + 8, 0);
    put32(q + 12, 0);
    uint8_t remote[40];
    size_t rl = sizeof(remote);
    r = command(OP_SPI_FLASH_MD5, q, 16, 0, 3000 + (p->size / 1024) * 10, NULL, remote, &rl);
    if (r != ESP_OK || rl < 32) { snprintf(err, cap, "vérification MD5 impossible pour %s", name); return r != ESP_OK ? r : ESP_FAIL; }
    for (int i = 0; i < 32; i++) remote[i] = (uint8_t)tolower(remote[i]);
    if (memcmp(remote, local, 32) != 0) { snprintf(err, cap, "MD5 différent pour %s : la flash n'a pas été écrite correctement", name); return ESP_ERR_INVALID_CRC; }
    flog("  MD5 vérifié : %s", local);
    return ESP_OK;
}

static void esp_task(void *arg)
{
    job_t *j = (job_t *)arg;
    char err[160] = "";
    part_t *parts = calloc(MAX_PARTS, sizeof(part_t));
    uint32_t flash_size = 0;
    int np = parts ? read_parts(j->path, parts, MAX_PARTS, &flash_size, err, sizeof(err)) : -1;
    bool linked = false;
    if (np < 0 && !err[0]) snprintf(err, sizeof(err), "mémoire insuffisante");

    if (np > 0) {
        uint32_t total = 0;
        for (int i = 0; i < np; i++) total += parts[i].size;
        flog("Programmation ESP32 : %d fichier(s), %lu octets", np, (unsigned long)total);
        if (usb_link_begin() != ESP_OK) snprintf(err, sizeof(err), "port USB occupé ou carte absente");
        else linked = true;

        bool usb_jtag = usb_link_vid() == 0x303A;
        if (!err[0]) {
            set_step(1, usb_jtag ? "connexion (USB natif Espressif)" : "connexion (pont USB-série)");
            if (!connect_rom(usb_jtag))
                snprintf(err, sizeof(err), "pas de réponse du bootloader : maintenez BOOT, appuyez sur EN/RST, relâchez BOOT puis relancez");
        }
        if (!err[0]) {
            const char *chip = detect_chip();
            lock();
            strlcpy(s_chip, chip ? chip : "?", sizeof(s_chip));
            unlock();
            const char *want = expected_chip(j->path);
            flog("Puce détectée : %s%s%s", chip ? chip : "inconnue", want ? " — firmware compilé pour " : "", want ? want : "");
            if (!chip) snprintf(err, sizeof(err), "puce non reconnue");
            else if (want && strcmp(want, chip) != 0)
                snprintf(err, sizeof(err), "ce firmware est compilé pour %s mais la carte est un %s", want, chip);
            else if (strcmp(chip, "esp32") != 0) {
                for (int i = 0; i < np; i++)
                    if (parts[i].offset == 0x1000 && strstr(parts[i].path, "bootloader"))
                        snprintf(err, sizeof(err), "bootloader à 0x1000 : réservé à l'ESP32 classique, pas au %s", chip);
            }
        }
        if (!err[0] && !usb_jtag) {   /* vitesse supérieure : le ROM accepte CHANGE_BAUDRATE */
            uint8_t cb[8];
            put32(cb, FAST_BAUD);
            put32(cb + 4, 0);
            if (command(OP_CHANGE_BAUD, cb, 8, 0, 500, NULL, NULL, NULL) == ESP_OK) {
                usb_link_set_baud(FAST_BAUD);
                vTaskDelay(pdMS_TO_TICKS(60));
                usb_link_rx_clear();
                uint32_t v;
                if (command(OP_READ_REG, (const uint8_t[]){0x00, 0x10, 0x00, 0x40}, 4, 0, 500, &v, NULL, NULL) == ESP_OK) {
                    flog("Vitesse de transfert : %d bauds", FAST_BAUD);
                } else {
                    flog("%d bauds non supportés par le pont : retour à 115200", FAST_BAUD);
                    if (!connect_rom(usb_jtag)) snprintf(err, sizeof(err), "connexion perdue après le changement de vitesse");
                    else detect_chip();
                }
            }
        }
        if (!err[0]) {
            set_step(3, "préparation de la mémoire flash");
            uint8_t att[8] = {0};
            if (command(OP_SPI_ATTACH, att, 8, 0, 3000, NULL, NULL, NULL) != ESP_OK) snprintf(err, sizeof(err), "SPI_ATTACH refusé");
        }
        if (!err[0]) {
            uint8_t sp[24];
            put32(sp, 0);
            put32(sp + 4, flash_size);
            put32(sp + 8, 64 * 1024);
            put32(sp + 12, 4 * 1024);
            put32(sp + 16, 256);
            put32(sp + 20, 0xFFFF);
            if (command(OP_SPI_SET_PARAMS, sp, 24, 0, 3000, NULL, NULL, NULL) != ESP_OK) snprintf(err, sizeof(err), "SPI_SET_PARAMS refusé");
            else flog("Flash configurée : %lu Mo", (unsigned long)(flash_size >> 20));
        }
        uint32_t done = 0;
        for (int i = 0; i < np && !err[0]; i++)
            if (write_part(&parts[i], &done, total, err, sizeof(err)) != ESP_OK && !err[0]) snprintf(err, sizeof(err), "écriture échouée");
        if (!err[0]) {
            set_step(97, "redémarrage de la carte");
            hard_reset();
        }
    }
    s_run_baud = guess_baud(j->path, 115200);
    if (linked) usb_link_end();
    if (!err[0]) {
        usb_serial_set_baud(s_run_baud);
        finish(true, "firmware écrit et vérifié (MD5) sur %s — moniteur à %lu bauds", s_chip, (unsigned long)s_run_baud);
    } else {
        finish(false, "%s", err);
    }
    led_status_mode(err[0] ? "error" : "ready");
    free(parts);
    free(j);
    s_busy = false;
    vTaskDelete(NULL);
}

esp_err_t usb_flash_start_esp(const char *bin_path, char *err, size_t cap)
{
    if (s_busy) { snprintf(err, cap, "une programmation est déjà en cours"); return ESP_ERR_INVALID_STATE; }
    if (s_det_busy) { snprintf(err, cap, "identification de la carte en cours, réessayez dans quelques secondes"); return ESP_ERR_INVALID_STATE; }
    if (!usb_avr_ready()) { snprintf(err, cap, "aucune carte branchée sur le port USB du MASTER"); return ESP_ERR_INVALID_STATE; }
    struct stat st;
    if (stat(bin_path, &st) != 0) { snprintf(err, cap, "fichier introuvable : %s", bin_path); return ESP_ERR_NOT_FOUND; }
    job_t *j = calloc(1, sizeof(*j));
    if (!j) return ESP_ERR_NO_MEM;
    strlcpy(j->path, bin_path, sizeof(j->path));
    job_reset("esp", bin_path);
    s_busy = true;
    if (xTaskCreate(esp_task, "usb_flash", 8192, j, 5, NULL) != pdPASS) {
        s_busy = false;
        free(j);
        snprintf(err, cap, "tâche impossible à créer");
        return ESP_ERR_NO_MEM;
    }
    return ESP_OK;
}

/* ======================= identification de la carte branchée ======================= */

static const char *board_name(const char *b)
{
    if (!strcmp(b, "avr")) return "Arduino (ATmega)";
    if (!strcmp(b, "esp32")) return "ESP32";
    if (!strcmp(b, "esp32s3")) return "ESP32-S3";
    if (!strcmp(b, "esp32c3")) return "ESP32-C3";
    if (!strcmp(b, "esp32s2")) return "ESP32-S2";
    if (!strcmp(b, "esp32c6")) return "ESP32-C6";
    if (!strcmp(b, "esp32h2")) return "ESP32-H2";
    return b;
}

static void detect_task(void *arg)
{
    vTaskDelay(pdMS_TO_TICKS((uint32_t)(uintptr_t)arg));
    char board[12] = "", profile[24] = "", text[160] = "";
    uint16_t vid = usb_link_vid();
    bool arduino_vid = vid == 0x2341 || vid == 0x2A03 || vid == 0x1B4F;   /* Arduino, Arduino.org, SparkFun */
    bool esp_vid = vid == 0x303A;                                       /* USB natif Espressif */
    if (usb_avr_ready() && !arduino_vid && usb_link_begin() == ESP_OK) {
        usb_link_set_baud(115200);
        bool ok = false;
        for (int a = 0; a < 4 && !ok; a++) {
            lines_seq(esp_vid ^ (a >= 2));
            vTaskDelay(pdMS_TO_TICKS(30));
            usb_link_rx_clear();
            ok = sync_once();
        }
        if (ok) {
            const char *chip = detect_chip();
            strlcpy(board, chip ? chip : "esp", sizeof(board));
        }
        hard_reset();   /* la carte redémarre sur son programme */
        usb_link_end();
    }
    if (!board[0] && !esp_vid && usb_avr_ready() && usb_avr_probe(profile, sizeof(profile)) == ESP_OK) strlcpy(board, "avr", sizeof(board));

    if (!usb_avr_ready()) snprintf(text, sizeof(text), "carte débranchée pendant l'identification");
    else if (!strcmp(board, "avr")) snprintf(text, sizeof(text), "Arduino détecté (bootloader %s) : flashez un projet .hex", profile);
    else if (!strcmp(board, "esp")) snprintf(text, sizeof(text), "ESP détecté, modèle non reconnu");
    else if (board[0]) snprintf(text, sizeof(text), "%s détecté : prêt pour le firmware worker ou un projet", board_name(board));
    else snprintf(text, sizeof(text), "carte non identifiée : bootloader muet (ESP32 : maintenez BOOT et appuyez sur EN, puis réessayez)");
    lock();
    strlcpy(s_det_board, board, sizeof(s_det_board));
    strlcpy(s_det_profile, profile, sizeof(s_det_profile));
    strlcpy(s_det_text, text, sizeof(s_det_text));
    s_det_seq++;
    unlock();
    evlog_add(board[0] ? 'S' : 'W', "usb", "%s", text);
    s_det_busy = false;
    vTaskDelete(NULL);
}

esp_err_t usb_flash_start_detect(uint32_t delay_ms, char *err, size_t cap)
{
    if (s_busy || s_det_busy) { if (err && cap) snprintf(err, cap, "carte déjà en cours de programmation ou d'identification"); return ESP_ERR_INVALID_STATE; }
    if (!usb_avr_ready()) { if (err && cap) snprintf(err, cap, "aucune carte branchée sur le port USB du MASTER"); return ESP_ERR_INVALID_STATE; }
    lock();
    s_det_board[0] = s_det_profile[0] = 0;
    strlcpy(s_det_text, "identification en cours…", sizeof(s_det_text));
    unlock();
    s_det_busy = true;
    if (xTaskCreate(detect_task, "usb_detect", 6144, (void *)(uintptr_t)(delay_ms > 10000 ? 10000 : delay_ms), 5, NULL) != pdPASS) {
        s_det_busy = false;
        if (err && cap) snprintf(err, cap, "tâche impossible à créer");
        return ESP_ERR_NO_MEM;
    }
    return ESP_OK;
}

void usb_flash_detect_json(cJSON *obj)
{
    if (!obj) return;
    bool present = usb_avr_ready();
    lock();
    cJSON_AddBoolToObject(obj, "busy", s_det_busy);
    cJSON_AddNumberToObject(obj, "seq", s_det_seq);
    cJSON_AddStringToObject(obj, "board", present ? s_det_board : "");
    cJSON_AddStringToObject(obj, "profile", present ? s_det_profile : "");
    cJSON_AddStringToObject(obj, "text", present ? s_det_text : "");
    unlock();
}
