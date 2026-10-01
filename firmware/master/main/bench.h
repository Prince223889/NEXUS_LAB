#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "cJSON.h"
#include "esp_err.h"

/* Banc fantôme : un worker « émulateur » imite les capteurs d'un projet et observe ses actionneurs pendant
 * qu'un worker « DUT » exécute ce projet (mode PROJECT). Le scénario et les résultats attendus viennent de
 * LAB.benchPayload() (catalog/src/12_bench.js). Une seule session à la fois. */
void bench_init(void);
/* Démarre une session ; `plan` est dupliqué. Renvoie ESP_ERR_INVALID_STATE si une session tourne déjà,
 * ESP_ERR_INVALID_ARG si le plan est incohérent (message dans err). */
esp_err_t bench_run(const cJSON *plan, const char *bin_path, uint8_t dut, uint8_t emu, char *err, size_t err_cap);
/* Demande l'arrêt ; le nettoyage (émulateur arrêté, DUT renvoyé au mode worker) est toujours exécuté. */
void bench_stop(void);
bool bench_running(void);
/* État de la session en cours ou de la dernière ; `detailed` ajoute le résultat de chaque étape. */
void bench_status_json(cJSON *obj, bool detailed);
