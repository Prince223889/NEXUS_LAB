idf_component_register(
    SRCS
        "app_main.c"
        "agent.c"
        "bench.c"
        "boot_button.c"
        "captive_dns.c"
        "dht11.c"
        "event_log.c"
        "http_util.c"
        "job_engine.c"
        "lab_config.c"
        "linktest.c"
        "led_status.c"
        "netmon.c"
        "notifications.c"
        "ota_manager.c"
        "reports.c"
        "storage.c"
        "telemetry.c"
        "usb_avr.c"
        "usb_flash.c"
        "veille.c"
        "web_api.c"
        "web_server.c"
        "wifi_lab.c"
        "worker_pool.c"
    INCLUDE_DIRS "."
    REQUIRES
        app_update
        esp_app_format
        esp_driver_gpio
        esp_driver_sdspi
        esp_driver_spi
        esp_event
        esp_http_client
        esp_http_server
        esp_hw_support
        esp_netif
        esp_system
        esp_timer
        esp_wifi
        fatfs
        freertos
        heap
        log
        lwip
        mbedtls
        nvs_flash
        sdmmc
        spi_flash
        vfs
        # composants gérés (idf_component.yml)
        cjson
        led_strip
        mdns
        usb
        usb_host_cdc_acm
        usb_host_ch34x_vcp
        usb_host_cp210x_vcp
        usb_host_ftdi_vcp
)

# Code applicatif : avertissements stricts (-Wall -Wextra hérités d'ESP-IDF) mais jamais bloquants,
# pour qu'une nouvelle version de GCC ne casse pas le build (le code est maintenu sans avertissement).
target_compile_options(${COMPONENT_LIB} PRIVATE -Wno-error)

# ---------------------------------------------------------------------------
# Interface web : www/src/*.js -> app.js (concaténation), puis index.html, app.css, app.js, catalog.js
# -> gzip reproductible -> embarqués dans le firmware (servis avec Content-Encoding: gzip).
# ---------------------------------------------------------------------------
idf_build_get_property(lab_python PYTHON)
set(LAB_WWW_DIR "${CMAKE_CURRENT_LIST_DIR}/../www")
set(LAB_TOOLS_DIR "${CMAKE_CURRENT_LIST_DIR}/../tools")
file(GLOB LAB_APP_SOURCES CONFIGURE_DEPENDS "${LAB_WWW_DIR}/src/*.js")
set(LAB_APP_JS "${CMAKE_CURRENT_BINARY_DIR}/www/app.js")
add_custom_command(
    OUTPUT "${LAB_APP_JS}"
    COMMAND "${lab_python}" "${LAB_TOOLS_DIR}/bundle_www.py" "${LAB_WWW_DIR}/src" "${LAB_APP_JS}"
    DEPENDS ${LAB_APP_SOURCES} "${LAB_TOOLS_DIR}/bundle_www.py"
    COMMENT "Assemblage de l'interface web (app.js)"
    VERBATIM)
foreach(asset index.html app.css catalog.js app.js)
    if(asset STREQUAL "app.js")
        set(src "${LAB_APP_JS}")
    else()
        set(src "${LAB_WWW_DIR}/${asset}")
    endif()
    set(dst "${CMAKE_CURRENT_BINARY_DIR}/${asset}.gz")
    add_custom_command(
        OUTPUT "${dst}"
        COMMAND "${lab_python}" "${LAB_TOOLS_DIR}/gzip_asset.py" "${src}" "${dst}"
        DEPENDS "${src}" "${LAB_TOOLS_DIR}/gzip_asset.py"
        COMMENT "Compression de l'interface web : ${asset}"
        VERBATIM)
    target_add_binary_data(${COMPONENT_TARGET} "${dst}" BINARY DEPENDS "${dst}")
endforeach()
