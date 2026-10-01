#pragma once
#include <stdint.h>
#include <stddef.h>
#include "cJSON.h"

/* Journal d'événements en mémoire (anneau) + copie sur la microSD.
 * Niveaux : 'I' info, 'W' avertissement, 'E' erreur, 'S' succès. */
void evlog_init(void);
void evlog_add(char level, const char *source, const char *fmt, ...) __attribute__((format(printf, 3, 4)));
uint32_t evlog_last_seq(void);
/* Ajoute à `arr` les événements dont seq > since (max `max_items`). */
void evlog_to_json(cJSON *arr, uint32_t since, int max_items);
