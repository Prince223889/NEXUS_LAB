#include "led_status.h"
#include "lab_config.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"
#include <string.h>

static const char *TAG = "led";
static led_strip_handle_t s_strip = NULL;
static char s_mode[16] = "boot";
static volatile bool s_manual = false;

typedef struct {
    const char *name;
    uint8_t r, g, b;
    uint8_t effect; /* 0 fixe, 1 respiration, 2 clignotement, 3 double flash */
} led_pattern_t;

static const led_pattern_t PATTERNS[] = {
    {"boot", 0, 0, 90, 1},     {"ready", 0, 70, 20, 1},    {"work", 0, 60, 110, 1},
    {"flash", 100, 0, 120, 2}, {"update", 110, 80, 0, 2},  {"warn", 120, 70, 0, 0},
    {"error", 140, 0, 0, 2},   {"offline", 120, 0, 0, 0},  {"storage", 0, 0, 120, 0},
    {"network", 0, 90, 60, 0}, {"identify", 120, 120, 120, 3}, {"off", 0, 0, 0, 0},
};

static const led_pattern_t *find_pattern(const char *mode)
{
    for (size_t i = 0; i < sizeof(PATTERNS) / sizeof(PATTERNS[0]); ++i)
        if (!strcmp(PATTERNS[i].name, mode)) return &PATTERNS[i];
    return &PATTERNS[0];
}

static void raw_set(unsigned r, unsigned g, unsigned b)
{
    if (!s_strip) return;
    led_strip_set_pixel(s_strip, 0, r, g, b);
    led_strip_refresh(s_strip);
}

void led_status_set(unsigned r, unsigned g, unsigned b)
{
    s_manual = true;
    raw_set(r, g, b);
}

static void led_task(void *arg)
{
    (void)arg;
    uint32_t tick = 0;
    for (;;) {
        if (!s_manual) {
            const led_pattern_t *p = find_pattern(s_mode);
            unsigned scale = 255;
            switch (p->effect) {
            case 1: { /* respiration douce, période 2,4 s */
                uint32_t ph = tick % 48;
                uint32_t tri = ph < 24 ? ph : 48 - ph;
                scale = 40 + (tri * 215) / 24;
                break;
            }
            case 2: scale = (tick % 8) < 4 ? 255 : 0; break;
            case 3: { uint32_t ph = tick % 20; scale = (ph == 0 || ph == 1 || ph == 4 || ph == 5) ? 255 : 0; break; }
            default: break;
            }
            raw_set(p->r * scale / 255, p->g * scale / 255, p->b * scale / 255);
        }
        tick++;
        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

void led_status_init(void)
{
    if (g_lab_cfg.rgb_gpio < 0) {
        ESP_LOGI(TAG, "LED RGB désactivée");
        return;
    }
    led_strip_config_t c = {
        .strip_gpio_num = g_lab_cfg.rgb_gpio,
        .max_leds = 1,
    };
    led_strip_rmt_config_t r = {
        .resolution_hz = 10 * 1000 * 1000,
        .flags.with_dma = false,
    };
    if (led_strip_new_rmt_device(&c, &r, &s_strip) == ESP_OK) {
        led_strip_clear(s_strip);
        xTaskCreate(led_task, "led", 2560, NULL, 2, NULL);
        ESP_LOGI(TAG, "LED RGB prête sur GPIO%d", g_lab_cfg.rgb_gpio);
    } else {
        ESP_LOGW(TAG, "LED RGB indisponible sur GPIO%d", g_lab_cfg.rgb_gpio);
    }
}

void led_status_mode(const char *mode)
{
    if (!mode) return;
    s_manual = false;
    strlcpy(s_mode, mode, sizeof(s_mode));
}

const char *led_status_current(void) { return s_mode; }
