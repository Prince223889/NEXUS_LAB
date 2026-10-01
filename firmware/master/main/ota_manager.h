#pragma once
#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"
#include "esp_http_server.h"
#include "cJSON.h"

void ota_manager_start(void);
/* Jeton temporaire (5 min) qui permet à un worker de télécharger un .bin de la SD. */
void ota_register_local_file(const char *token, const char *path);
const char *ota_local_path_for_token(const char *token);
void ota_check_now(char *out, size_t cap);
void ota_approve(char *out, size_t cap);
/* Mise à jour du MASTER par envoi direct du .bin depuis le navigateur (corps HTTP brut). */
esp_err_t ota_upload_handler(httpd_req_t *req, char *msg, size_t cap);
void ota_info_json(cJSON *obj);
bool ota_busy(void);
