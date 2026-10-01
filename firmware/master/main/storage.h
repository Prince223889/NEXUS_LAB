#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "esp_err.h"
#include "cJSON.h"

void storage_init(void);
bool storage_ready(void);
const char *storage_root(void);
esp_err_t storage_prepare_tree(void);
esp_err_t storage_mkdir(const char *path);
esp_err_t storage_import_inbox(void);
esp_err_t storage_sha256_file(const char *path, char hex[65]);
esp_err_t storage_write_text(const char *path, const char *text);
esp_err_t storage_append_text(const char *path, const char *text);
/* Supprime un fichier ou un dossier vide. */
esp_err_t storage_delete(const char *path);
esp_err_t storage_rename(const char *from, const char *to);
esp_err_t storage_usage(uint64_t *total_bytes, uint64_t *free_bytes);
/* Liste un dossier en JSON [{name,type,size,mtime}] ; renvoie ESP_ERR_NOT_FOUND si absent. */
esp_err_t storage_list_json(const char *dir, cJSON *arr, int max_items);
/* Chemin sûr : /sd, /sd/... sans "..", "//", "\\", caractères de contrôle. */
bool storage_path_valid(const char *path, bool allow_root);
bool storage_name_valid(const char *name);
