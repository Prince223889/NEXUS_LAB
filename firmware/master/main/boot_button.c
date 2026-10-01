#include "boot_button.h"
#include "lab_config.h"
#include "event_log.h"
#include "led_status.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "bouton";

/* BOOT maintenu 3 s  : réaffiche les identifiants sur le port série + LED blanche.
 * BOOT maintenu 10 s : réinitialise la configuration (Wi-Fi, mots de passe) puis redémarre. */
static void button_task(void *arg)
{
    (void)arg;
    gpio_config_t io = {
        .pin_bit_mask = 1ULL << BOOT_BUTTON_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
    };
    gpio_config(&io);
    int held_ms = 0;
    bool shown = false;
    for (;;) {
        if (gpio_get_level(BOOT_BUTTON_GPIO) == 0) {
            held_ms += 100;
            if (held_ms >= 3000 && !shown) {
                shown = true;
                led_status_mode("identify");
                lab_config_print_credentials();
                ESP_LOGW(TAG, "Continuez à maintenir BOOT 7 s de plus pour effacer la configuration.");
            }
            if (held_ms >= 10000) {
                ESP_LOGE(TAG, "RÉINITIALISATION de la configuration demandée par le bouton BOOT");
                evlog_add('W', "system", "configuration réinitialisée par le bouton BOOT");
                lab_config_factory_reset();
                led_status_mode("error");
                vTaskDelay(pdMS_TO_TICKS(800));
                esp_restart();
            }
        } else {
            if (shown) led_status_mode("ready");
            held_ms = 0;
            shown = false;
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void boot_button_start(void)
{
    xTaskCreate(button_task, "boot_btn", 3072, NULL, 2, NULL);
}
