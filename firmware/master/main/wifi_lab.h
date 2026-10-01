#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "cJSON.h"

void wifi_lab_start(void);
bool wifi_lab_sta_connected(void);
bool wifi_lab_internet_shared(void);
const char *wifi_lab_sta_ip(void);
int wifi_lab_sta_rssi(void);
int wifi_lab_ap_clients(void);
bool wifi_lab_time_synced(void);
/* Scan asynchrone des réseaux Wi-Fi environnants. */
esp_err_t wifi_lab_scan_start(void);
/* Remplit `obj` : {state:"idle|running|done", networks:[...]} */
void wifi_lab_scan_json(cJSON *obj);
