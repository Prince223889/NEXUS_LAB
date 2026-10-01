#include "dht11.h"
#include "driver/gpio.h"
#include "esp_rom_sys.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <stdint.h>
#include <string.h>

static portMUX_TYPE s_mux = portMUX_INITIALIZER_UNLOCKED;

/* Attend que la ligne passe au niveau `level` ; renvoie la durée écoulée (µs) ou -1 si délai dépassé. */
static int wait_level(int gpio, int level, int timeout_us)
{
    int64_t start = esp_timer_get_time();
    while (gpio_get_level(gpio) != level) {
        if (esp_timer_get_time() - start > timeout_us) return -1;
    }
    return (int)(esp_timer_get_time() - start);
}

bool dht_read(int gpio, int type, float *temp_c, float *humidity)
{
    if (gpio < 0 || !temp_c || !humidity) return false;
    uint8_t data[5] = {0};

    gpio_reset_pin(gpio);
    gpio_set_direction(gpio, GPIO_MODE_INPUT_OUTPUT_OD);
    gpio_set_pull_mode(gpio, GPIO_PULLUP_ONLY);
    gpio_set_level(gpio, 0);
    /* signal de départ : >= 18 ms (DHT11), >= 1 ms (DHT22) */
    vTaskDelay(pdMS_TO_TICKS(type == 22 ? 2 : 20));

    bool ok = true;
    taskENTER_CRITICAL(&s_mux);
    gpio_set_level(gpio, 1);
    esp_rom_delay_us(30);
    if (wait_level(gpio, 0, 120) < 0 || wait_level(gpio, 1, 120) < 0 || wait_level(gpio, 0, 120) < 0) {
        ok = false;
    } else {
        for (int i = 0; i < 40; i++) {
            if (wait_level(gpio, 1, 90) < 0) { ok = false; break; }
            int high = wait_level(gpio, 0, 110);
            if (high < 0) { ok = false; break; }
            data[i / 8] <<= 1;
            if (high > 45) data[i / 8] |= 1; /* « 0 » ≈ 26-28 µs, « 1 » ≈ 70 µs */
        }
    }
    taskEXIT_CRITICAL(&s_mux);
    gpio_set_level(gpio, 1);
    if (!ok) return false;

    uint8_t sum = (uint8_t)(data[0] + data[1] + data[2] + data[3]);
    if (sum != data[4]) return false;
    if (type == 22) {
        float h = (float)(((uint16_t)data[0] << 8) | data[1]) / 10.0f;
        float t = (float)((((uint16_t)data[2] & 0x7F) << 8) | data[3]) / 10.0f;
        if (data[2] & 0x80) t = -t;
        if (h > 100.0f || t < -40.0f || t > 80.0f) return false;
        *humidity = h;
        *temp_c = t;
    } else {
        float h = (float)data[0] + (float)data[1] * 0.1f;
        float t = (float)(data[2] & 0x7F) + (float)(data[3] & 0x0F) * 0.1f;
        if (data[2] & 0x80) t = -t;
        if (h > 100.0f || t < -20.0f || t > 60.0f) return false;
        *humidity = h;
        *temp_c = t;
    }
    return true;
}
