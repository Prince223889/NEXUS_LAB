#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "cJSON.h"

/* Historique glissant (10 min, 1 point / 5 s) des mesures du MASTER + mesures reçues
 * des cartes du labo (« capteurs distants », UDP 4213). */
void telemetry_start(void);
float telemetry_temp(void);
float telemetry_humidity(void);
void telemetry_history_json(cJSON *obj);
void telemetry_feeds_json(cJSON *arr);
/* Dernière valeur d'un flux « source|clé » ; false si ce flux n'a jamais été reçu. */
bool telemetry_feed_get(const char *source, const char *key, float *value, int64_t *updated_ms);
