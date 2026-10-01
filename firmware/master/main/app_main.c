/* ESP32 LAB — MASTER (ESP32-S3, ESP-IDF 6.1)
 * Ordre de démarrage : NVS → configuration → journal → Wi-Fi → microSD → services → serveur web. */
#include "lab_config.h"
#include "agent.h"
#include "bench.h"
#include "boot_button.h"
#include "event_log.h"
#include "job_engine.h"
#include "led_status.h"
#include "netmon.h"
#include "linktest.h"
#include "notifications.h"
#include "ota_manager.h"
#include "reports.h"
#include "storage.h"
#include "telemetry.h"
#include "usb_avr.h"
#include "web_server.h"
#include "wifi_lab.h"
#include "worker_pool.h"
#include "esp_chip_info.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "nvs_flash.h"

static const char *TAG = "master";

void app_main(void)
{
    esp_err_t r = nvs_flash_init();
    if (r == ESP_ERR_NVS_NO_FREE_PAGES || r == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        r = nvs_flash_init();
    }
    ESP_ERROR_CHECK(r);

    evlog_init();
    lab_config_load(&g_lab_cfg);
    esp_chip_info_t info;
    esp_chip_info(&info);
    ESP_LOGI(TAG, "%s %s « %s » — %d cœurs, révision %d, PSRAM %u Ko", LAB_NAME, LAB_VERSION, LAB_CODENAME, info.cores,
             info.revision, (unsigned)(heap_caps_get_total_size(MALLOC_CAP_SPIRAM) / 1024));

    led_status_init();
    led_status_mode("boot");
    wifi_lab_start();
    storage_init();
    evlog_add('I', "system", "démarrage %s (%s)", LAB_VERSION, storage_ready() ? "microSD OK" : "sans microSD");

    notifications_start();
    worker_pool_start();
    job_engine_start();
    bench_init();
    netmon_init();
    linktest_start();
    telemetry_start();
    reports_init();
    reports_start();
    agent_start();
    ota_manager_start();
    boot_button_start();
    r = usb_avr_init();
    if (r != ESP_OK) evlog_add('W', "usb", "hôte USB indisponible (%s)", esp_err_to_name(r));
    web_server_start();

    /* L'application a démarré correctement : on valide l'image (annule le retour arrière OTA). */
    esp_err_t confirm = esp_ota_mark_app_valid_cancel_rollback();
    if (confirm == ESP_OK) ESP_LOGI(TAG, "image OTA validée");

    led_status_mode("ready");
    ESP_LOGI(TAG, "MASTER prêt : http://" AP_IP_STR "/  (Wi-Fi « %s »)", g_lab_cfg.ap_ssid);
    ESP_LOGI(TAG, "Maintenez BOOT 3 s pour afficher les identifiants d'administration.");
}
