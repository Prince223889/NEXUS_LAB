#include "usb_avr.h"
#include "lab_config.h"
#include "event_log.h"
#include "led_status.h"
#include "driver/gpio.h"
#include "esp_check.h"
#include "esp_intr_alloc.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "usb/cdc_acm_host.h"
#include "usb/usb_host.h"
#include "usb/vcp_ch34x.h"
#include "usb/vcp_cp210x.h"
#include "usb/vcp_ftdi.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *TAG = "usb_avr";

/* ---------- état ---------- */
static cdc_acm_dev_hdl_t s_dev = NULL;
static volatile bool s_ready = false;
static volatile bool s_installed = false;
static volatile bool s_closing = false;
static volatile uint16_t s_new_vid = 0, s_new_pid = 0;
static uint16_t s_vid = 0, s_pid = 0;
static char s_chip[16] = "-";
static uint32_t s_baud = 115200;
static SemaphoreHandle_t s_lock = NULL;
static volatile bool s_flashing = false;
static usb_progress_cb_t s_progress = NULL;

void usb_avr_set_progress_cb(usb_progress_cb_t cb) { s_progress = cb; }
#define PROGRESS(p, s) do { if (s_progress) s_progress((p), (s)); } while (0)

/* Tampon « programmation » (réponses STK500). */
static uint8_t s_rx[1024];
static size_t s_rx_len = 0;

/* Tampon circulaire « moniteur série » (8 Ko). */
#define MON_SIZE 8192
static uint8_t s_mon[MON_SIZE];
static uint32_t s_mon_total = 0; /* nombre total d'octets reçus (position absolue) */

static bool rx_cb(const uint8_t *data, size_t len, void *arg)
{
    (void)arg;
    if (!s_lock || xSemaphoreTake(s_lock, pdMS_TO_TICKS(5)) != pdTRUE) return true;
    if (s_flashing) {
        size_t room = sizeof(s_rx) - s_rx_len;
        size_t n = len > room ? room : len;
        if (n) { memcpy(s_rx + s_rx_len, data, n); s_rx_len += n; }
    } else {
        for (size_t i = 0; i < len; i++) {
            s_mon[s_mon_total % MON_SIZE] = data[i];
            s_mon_total++;
        }
    }
    xSemaphoreGive(s_lock);
    return true;
}

static void event_cb(const cdc_acm_host_dev_event_data_t *event, void *arg)
{
    (void)arg;
    if (!event) return;
    if (event->type == CDC_ACM_HOST_DEVICE_DISCONNECTED) {
        /* La fermeture se fait dans la tâche de connexion (pas depuis le callback). */
        s_ready = false;
        s_closing = true;
    } else if (event->type == CDC_ACM_HOST_ERROR) {
        ESP_LOGW(TAG, "erreur hôte CDC %d", event->data.error);
    }
}

static void new_dev_cb(usb_device_handle_t usb_dev)
{
    const usb_device_desc_t *desc = NULL;
    if (usb_host_get_device_descriptor(usb_dev, &desc) == ESP_OK && desc) {
        s_new_vid = desc->idVendor;
        s_new_pid = desc->idProduct;
    }
}

static void usb_host_events_task(void *arg)
{
    (void)arg;
    for (;;) {
        uint32_t flags = 0;
        esp_err_t err = usb_host_lib_handle_events(pdMS_TO_TICKS(200), &flags);
        if (err != ESP_OK && err != ESP_ERR_TIMEOUT) ESP_LOGW(TAG, "événement hôte USB : %s", esp_err_to_name(err));
        if (flags & USB_HOST_LIB_EVENT_FLAGS_NO_CLIENTS) usb_host_device_free_all();
    }
}

static esp_err_t open_device(uint16_t vid, cdc_acm_dev_hdl_t *h)
{
    cdc_acm_host_device_config_t cfg = {
        .connection_timeout_ms = 1500,
        .out_buffer_size = 512,
        .in_buffer_size = 512,
        .event_cb = event_cb,
        .data_cb = rx_cb,
        .user_arg = NULL,
    };
    switch (vid) {
    case NANJING_QINHENG_MICROE_VID:
        strlcpy(s_chip, "CH34x", sizeof(s_chip));
        return ch34x_vcp_open(CH34X_PID_AUTO, 0, &cfg, h);
    case SILICON_LABS_VID:
        strlcpy(s_chip, "CP210x", sizeof(s_chip));
        return cp210x_vcp_open(CP210X_PID_AUTO, 0, &cfg, h);
    case FTDI_VID:
        strlcpy(s_chip, "FTDI", sizeof(s_chip));
        return ftdi_vcp_open(FTDI_PID_AUTO, 0, &cfg, h);
    default:
        strlcpy(s_chip, "CDC-ACM", sizeof(s_chip));
        return cdc_acm_host_open(CDC_HOST_ANY_VID, CDC_HOST_ANY_PID, 0, &cfg, h);
    }
}

static esp_err_t apply_line(uint32_t baud, bool dtr_rts)
{
    if (!s_dev) return ESP_ERR_INVALID_STATE;
    cdc_acm_line_coding_t lc = {.dwDTERate = baud, .bCharFormat = 0, .bParityType = 0, .bDataBits = 8};
    esp_err_t r = cdc_acm_host_line_coding_set(s_dev, &lc);
    cdc_acm_host_set_control_line_state(s_dev, dtr_rts, dtr_rts);
    return r;
}

static void cdc_connect_task(void *arg)
{
    (void)arg;
    for (;;) {
        if (s_closing) {
            if (s_dev) cdc_acm_host_close(s_dev);
            s_dev = NULL;
            s_closing = false;
            evlog_add('W', "usb", "carte USB (%s) débranchée", s_chip);
            strlcpy(s_chip, "-", sizeof(s_chip));
        }
        if (!s_dev && s_new_vid) {
            uint16_t vid = s_new_vid, pid = s_new_pid;
            cdc_acm_dev_hdl_t h = NULL;
            if (open_device(vid, &h) == ESP_OK) {
                s_dev = h;
                s_vid = vid;
                s_pid = pid;
                s_new_vid = 0;
                apply_line(s_baud, true);
                s_ready = true;
                evlog_add('S', "usb", "carte USB détectée : %s %04X:%04X", s_chip, vid, pid);
            } else {
                ESP_LOGW(TAG, "périphérique %04X:%04X non série ou non pris en charge", vid, pid);
                s_new_vid = 0;
            }
        }
        vTaskDelay(pdMS_TO_TICKS(300));
    }
}

esp_err_t usb_avr_init(void)
{
    s_lock = xSemaphoreCreateMutex();
    if (!s_lock) return ESP_ERR_NO_MEM;
#if USB_HOST_VBUS_EN_GPIO >= 0
    gpio_set_direction(USB_HOST_VBUS_EN_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(USB_HOST_VBUS_EN_GPIO, 1);
    vTaskDelay(pdMS_TO_TICKS(100));
#endif
    usb_host_config_t host_cfg = {.skip_phy_setup = false, .intr_flags = ESP_INTR_FLAG_LEVEL1};
    ESP_RETURN_ON_ERROR(usb_host_install(&host_cfg), TAG, "usb_host_install");
    xTaskCreate(usb_host_events_task, "usb_host", 4096, NULL, 10, NULL);
    cdc_acm_host_driver_config_t drv_cfg = {
        .driver_task_stack_size = 4096,
        .driver_task_priority = 11,
        .xCoreID = 0,
        .new_dev_cb = new_dev_cb,
    };
    ESP_RETURN_ON_ERROR(cdc_acm_host_install(&drv_cfg), TAG, "cdc_acm_host_install");
    xTaskCreate(cdc_connect_task, "usb_connect", 4096, NULL, 8, NULL);
    s_installed = true;
    return ESP_OK;
}

bool usb_avr_ready(void) { return s_ready; }

void usb_avr_info_json(cJSON *obj)
{
    if (!obj) return;
    char id[12];
    snprintf(id, sizeof(id), "%04X:%04X", s_vid, s_pid);
    cJSON_AddBoolToObject(obj, "host", s_installed);
    cJSON_AddBoolToObject(obj, "connected", s_ready);
    cJSON_AddStringToObject(obj, "chip", s_chip);
    cJSON_AddStringToObject(obj, "vid_pid", s_ready ? id : "-");
    cJSON_AddNumberToObject(obj, "baud", s_baud);
    cJSON_AddBoolToObject(obj, "flashing", s_flashing);
    cJSON_AddNumberToObject(obj, "rx_total", s_mon_total);
}

/* ---------- moniteur série ---------- */

esp_err_t usb_serial_set_baud(uint32_t baud)
{
    if (baud < 300 || baud > 2000000) return ESP_ERR_INVALID_ARG;
    s_baud = baud;
    if (!s_ready || s_flashing) return s_ready ? ESP_ERR_INVALID_STATE : ESP_OK;
    return apply_line(baud, true);
}

esp_err_t usb_serial_write(const uint8_t *data, size_t len)
{
    if (!s_ready || !s_dev) return ESP_ERR_INVALID_STATE;
    if (s_flashing) return ESP_ERR_INVALID_STATE;
    return cdc_acm_host_data_tx_blocking(s_dev, data, len, 1000);
}

uint32_t usb_serial_read(uint32_t since, char *out, size_t cap, size_t *out_len)
{
    size_t n = 0;
    if (!s_lock || !out || cap == 0) { if (out_len) *out_len = 0; return since; }
    xSemaphoreTake(s_lock, portMAX_DELAY);
    uint32_t total = s_mon_total;
    uint32_t start = since;
    if (total - start > MON_SIZE || start > total) start = total > MON_SIZE ? total - MON_SIZE : 0;
    if (total - start > cap) start = total - (uint32_t)cap;
    for (uint32_t i = start; i < total; i++) out[n++] = (char)s_mon[i % MON_SIZE];
    xSemaphoreGive(s_lock);
    if (out_len) *out_len = n;
    return total;
}

/* ---------- STK500v1 ---------- */

static void rx_clear(void)
{
    xSemaphoreTake(s_lock, portMAX_DELAY);
    s_rx_len = 0;
    xSemaphoreGive(s_lock);
}

static size_t rx_take(uint8_t *out, size_t want, uint32_t timeout_ms)
{
    TickType_t start = xTaskGetTickCount();
    size_t got = 0;
    while (got < want && (xTaskGetTickCount() - start) < pdMS_TO_TICKS(timeout_ms)) {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        size_t n = s_rx_len < (want - got) ? s_rx_len : (want - got);
        if (n) {
            memcpy(out + got, s_rx, n);
            memmove(s_rx, s_rx + n, s_rx_len - n);
            s_rx_len -= n;
            got += n;
        }
        xSemaphoreGive(s_lock);
        if (got < want) vTaskDelay(pdMS_TO_TICKS(2));
    }
    return got;
}

static esp_err_t tx(const uint8_t *data, size_t len)
{
    if (!s_dev) return ESP_ERR_INVALID_STATE;
    return cdc_acm_host_data_tx_blocking(s_dev, data, len, 2000);
}

/* Envoie une commande et attend STK_INSYNC(0x14) [payload] STK_OK(0x10). */
static esp_err_t stk_cmd(const uint8_t *cmd, size_t len, uint8_t *payload, size_t payload_len, uint32_t timeout_ms)
{
    rx_clear();
    ESP_RETURN_ON_ERROR(tx(cmd, len), TAG, "tx");
    uint8_t b = 0;
    if (rx_take(&b, 1, timeout_ms) != 1 || b != 0x14) return ESP_ERR_INVALID_RESPONSE;
    if (payload_len && rx_take(payload, payload_len, timeout_ms) != payload_len) return ESP_ERR_TIMEOUT;
    if (rx_take(&b, 1, timeout_ms) != 1 || b != 0x10) return ESP_ERR_INVALID_RESPONSE;
    return ESP_OK;
}

static esp_err_t stk_sync(void)
{
    const uint8_t c[] = {0x30, 0x20};
    for (int attempt = 0; attempt < 8; attempt++) {
        if (stk_cmd(c, sizeof(c), NULL, 0, 250) == ESP_OK) return ESP_OK;
    }
    return ESP_FAIL;
}

static esp_err_t stk_load_address(uint32_t word_addr)
{
    const uint8_t c[] = {0x55, (uint8_t)(word_addr & 0xff), (uint8_t)((word_addr >> 8) & 0xff), 0x20};
    return stk_cmd(c, sizeof(c), NULL, 0, 500);
}

static esp_err_t stk_program_page(const uint8_t *data, size_t len)
{
    uint8_t *frame = malloc(len + 5);
    if (!frame) return ESP_ERR_NO_MEM;
    frame[0] = 0x64;
    frame[1] = (uint8_t)(len >> 8);
    frame[2] = (uint8_t)len;
    frame[3] = 'F';
    memcpy(frame + 4, data, len);
    frame[len + 4] = 0x20;
    esp_err_t r = stk_cmd(frame, len + 5, NULL, 0, 1500);
    free(frame);
    return r;
}

static esp_err_t stk_read_page(uint8_t *data, size_t len)
{
    const uint8_t c[] = {0x74, (uint8_t)(len >> 8), (uint8_t)len, 'F', 0x20};
    return stk_cmd(c, sizeof(c), data, len, 1500);
}

static int hexval(char c)
{
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return -1;
}

static bool hexbyte(const char *p, uint8_t *out)
{
    int a = hexval(p[0]), b = hexval(p[1]);
    if (a < 0 || b < 0) return false;
    *out = (uint8_t)((a << 4) | b);
    return true;
}

static bool parse_hex(const char *path, uint8_t *memory, size_t cap, size_t *used, char *err, size_t err_cap)
{
    FILE *f = fopen(path, "r");
    if (!f) { snprintf(err, err_cap, "fichier introuvable"); return false; }
    memset(memory, 0xff, cap);
    char line[600];
    uint32_t base = 0;
    size_t max_addr = 0;
    bool saw_eof = false;
    int lineno = 0;
    bool ok = true;
    while (ok && fgets(line, sizeof(line), f)) {
        lineno++;
        size_t n = strcspn(line, "\r\n");
        line[n] = 0;
        if (!line[0]) continue;
        uint8_t len, ah, al, type;
        if (line[0] != ':' || n < 11 || !hexbyte(line + 1, &len) || !hexbyte(line + 3, &ah) || !hexbyte(line + 5, &al) ||
            !hexbyte(line + 7, &type) || n != 11 + (size_t)len * 2) {
            snprintf(err, err_cap, "ligne %d mal formée", lineno);
            ok = false;
            break;
        }
        uint8_t sum = 0;
        for (size_t i = 1; i < n; i += 2) {
            uint8_t v;
            if (!hexbyte(line + i, &v)) { ok = false; break; }
            sum = (uint8_t)(sum + v);
        }
        if (!ok || sum != 0) { snprintf(err, err_cap, "somme de contrôle ligne %d", lineno); ok = false; break; }
        uint16_t addr = (uint16_t)((ah << 8) | al);
        if (type == 0x00) {
            for (size_t i = 0; i < len; i++) {
                uint8_t v;
                uint32_t a = base + addr + (uint32_t)i;
                if (!hexbyte(line + 9 + i * 2, &v) || a >= cap) {
                    snprintf(err, err_cap, "adresse 0x%05lX hors mémoire flash", (unsigned long)a);
                    ok = false;
                    break;
                }
                memory[a] = v;
                if (a + 1 > max_addr) max_addr = a + 1;
            }
        } else if (type == 0x01) {
            saw_eof = true;
            break;
        } else if (type == 0x02 || type == 0x04) {
            uint8_t hi, lo;
            if (len != 2 || !hexbyte(line + 9, &hi) || !hexbyte(line + 11, &lo)) { ok = false; break; }
            uint32_t v = ((uint32_t)hi << 8) | lo;
            base = type == 0x02 ? (v << 4) : (v << 16);
        }
    }
    fclose(f);
    if (ok && !saw_eof) { snprintf(err, err_cap, "enregistrement de fin absent"); ok = false; }
    if (ok && max_addr == 0) { snprintf(err, err_cap, "fichier vide"); ok = false; }
    *used = max_addr;
    return ok;
}

static void reset_target(void)
{
    /* Impulsion DTR/RTS : le condensateur 100 nF de la carte provoque le reset de l'ATmega. */
    cdc_acm_host_set_control_line_state(s_dev, false, false);
    vTaskDelay(pdMS_TO_TICKS(100));
    cdc_acm_host_set_control_line_state(s_dev, true, true);
    vTaskDelay(pdMS_TO_TICKS(60));
}

typedef struct {
    const char *name;
    uint32_t baud;
    size_t flash;
    size_t page;
    uint32_t sig;
} avr_profile_t;

static const avr_profile_t PROFILES[] = {
    {"ATmega328P_Optiboot", 115200, 32768 - 512, 128, 0x1E950F},  /* Uno, Nano (nouveau bootloader) */
    {"ATmega328P_Old", 57600, 32768 - 2048, 128, 0x1E950F},       /* Nano « Old Bootloader » */
    {"ATmega168P_STK500", 19200, 16384 - 2048, 128, 0x1E9406},    /* Diecimila / Nano 168 */
};

/* ---------- liaison brute (programmeur ESP32, usb_esp.c) ---------- */

esp_err_t usb_link_begin(void)
{
    if (!s_ready || !s_dev) return ESP_ERR_INVALID_STATE;
    if (s_flashing) return ESP_ERR_INVALID_STATE;
    rx_clear();
    s_flashing = true;
    led_status_mode("flash");
    return ESP_OK;
}

void usb_link_end(void)
{
    if (!s_flashing) return;
    if (s_dev) apply_line(s_baud, true);
    s_flashing = false;
}

esp_err_t usb_link_tx(const uint8_t *data, size_t len) { return tx(data, len); }
size_t usb_link_rx(uint8_t *out, size_t want, uint32_t timeout_ms) { return rx_take(out, want, timeout_ms); }
void usb_link_rx_clear(void) { rx_clear(); }
uint16_t usb_link_vid(void) { return s_vid; }
uint32_t usb_monitor_baud(void) { return s_baud; }

esp_err_t usb_link_set_baud(uint32_t baud)
{
    if (!s_dev) return ESP_ERR_INVALID_STATE;
    cdc_acm_line_coding_t lc = {.dwDTERate = baud, .bCharFormat = 0, .bParityType = 0, .bDataBits = 8};
    return cdc_acm_host_line_coding_set(s_dev, &lc);
}

void usb_link_set_lines(bool dtr, bool rts)
{
    if (s_dev) cdc_acm_host_set_control_line_state(s_dev, dtr, rts);
}

esp_err_t usb_avr_flash_hex(const char *path, const char *profile, char *result, size_t cap)
{
    if (!result || cap == 0) return ESP_ERR_INVALID_ARG;
    if (!s_ready || !s_dev) { snprintf(result, cap, "aucune carte USB connectée"); return ESP_ERR_INVALID_STATE; }
    if (s_flashing) { snprintf(result, cap, "programmation déjà en cours"); return ESP_ERR_INVALID_STATE; }
    const avr_profile_t *pf = NULL;
    for (size_t i = 0; i < sizeof(PROFILES) / sizeof(PROFILES[0]); i++)
        if (profile && !strcmp(profile, PROFILES[i].name)) pf = &PROFILES[i];
    if (!pf) { snprintf(result, cap, "profil AVR inconnu"); return ESP_ERR_NOT_SUPPORTED; }

    uint8_t *memory = malloc(pf->flash);
    uint8_t *verify = malloc(pf->page);
    if (!memory || !verify) { free(memory); free(verify); snprintf(result, cap, "mémoire insuffisante"); return ESP_ERR_NO_MEM; }
    size_t used = 0;
    char err[80] = {0};
    if (!parse_hex(path, memory, pf->flash, &used, err, sizeof(err))) {
        free(memory);
        free(verify);
        snprintf(result, cap, "HEX invalide : %s", err);
        return ESP_FAIL;
    }

    s_flashing = true;
    led_status_mode("flash");
    PROGRESS(2, "reset de la carte et synchronisation");
    esp_err_t r = apply_line(pf->baud, true);
    reset_target();
    if (r == ESP_OK) r = stk_sync();
    if (r != ESP_OK) snprintf(result, cap, "pas de réponse du bootloader à %lu bauds (profil ?)", (unsigned long)pf->baud);
    uint8_t sig[3] = {0};
    if (r == ESP_OK) {
        const uint8_t enter[] = {0x50, 0x20};
        r = stk_cmd(enter, sizeof(enter), NULL, 0, 500);
        if (r != ESP_OK) snprintf(result, cap, "entrée en mode programmation refusée");
    }
    if (r == ESP_OK) {
        const uint8_t rs[] = {0x75, 0x20};
        r = stk_cmd(rs, sizeof(rs), sig, 3, 500);
        uint32_t sv = ((uint32_t)sig[0] << 16) | ((uint32_t)sig[1] << 8) | sig[2];
        if (r != ESP_OK) snprintf(result, cap, "signature illisible");
        else if (sv != pf->sig) {
            snprintf(result, cap, "signature %06lX inattendue (attendu %06lX)", (unsigned long)sv, (unsigned long)pf->sig);
            r = ESP_ERR_NOT_SUPPORTED;
        }
    }
    if (r == ESP_OK) PROGRESS(5, "écriture de la mémoire flash");
    for (size_t addr = 0; r == ESP_OK && addr < used; addr += pf->page) {
        size_t n = (used - addr > pf->page) ? pf->page : used - addr;
        r = stk_load_address((uint32_t)(addr / 2));
        if (r == ESP_OK) r = stk_program_page(memory + addr, n);
        if (r != ESP_OK) snprintf(result, cap, "écriture échouée à 0x%04X", (unsigned)addr);
        else PROGRESS(5 + (int)(65 * (addr + n) / used), "écriture de la mémoire flash");
    }
    if (r == ESP_OK) PROGRESS(70, "vérification (relecture)");
    for (size_t addr = 0; r == ESP_OK && addr < used; addr += pf->page) {
        size_t n = (used - addr > pf->page) ? pf->page : used - addr;
        PROGRESS(70 + (int)(29 * (addr + n) / used), "vérification (relecture)");
        r = stk_load_address((uint32_t)(addr / 2));
        if (r == ESP_OK) r = stk_read_page(verify, n);
        if (r == ESP_OK && memcmp(verify, memory + addr, n) != 0) r = ESP_ERR_INVALID_CRC;
        if (r != ESP_OK) snprintf(result, cap, "vérification échouée à 0x%04X", (unsigned)addr);
    }
    const uint8_t leave[] = {0x51, 0x20};
    (void)stk_cmd(leave, sizeof(leave), NULL, 0, 300);
    if (r == ESP_OK) {
        snprintf(result, cap, "%u octets programmés et vérifiés (signature %02X%02X%02X)", (unsigned)used, sig[0], sig[1], sig[2]);
    }
    free(memory);
    free(verify);
    apply_line(s_baud, true);
    s_flashing = false;
    led_status_mode(r == ESP_OK ? "ready" : "error");
    evlog_add(r == ESP_OK ? 'S' : 'E', "usb", "flash AVR : %s", result);
    return r;
}
