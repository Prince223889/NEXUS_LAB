#pragma once
#include <stdbool.h>
#include "esp_http_server.h"

void web_server_start(void);
httpd_handle_t web_server_handle(void);
/* Vrai si la requête porte un cookie de session administrateur valide. */
bool web_is_admin(httpd_req_t *r);
/* Enregistre les routes /api/... (web_api.c). */
void web_api_register(httpd_handle_t h);
/* Macro utilisée par les gestionnaires réservés à l'administrateur. */
#define REQUIRE_ADMIN(r) do { if (!web_is_admin(r)) return http_error((r), 401, "connexion administrateur requise"); } while (0)
