#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "cJSON.h"

/* Wireshark du Labo : capture et décodage en direct des trames du labo (UDP 4211/4212/4213 + émissions),
 * avec perte et gigue par worker. N'observe QUE le trafic du labo, jamais un réseau tiers.
 * La capture est explicite : désarmée au démarrage, sans coût tant qu'elle ne l'est pas. */

/* Sens de la trame. */
enum { NM_RX = 0, NM_TX = 1 };
/* Types de trame reconnus (ESPNOW réservé : aucun transport ESP-NOW pour l'instant). */
enum { NM_OTHER = 0, NM_HELLO, NM_ASSIGN, NM_HB, NM_APP, NM_DISCOVER, NM_HOME, NM_LAB, NM_LOG, NM_HTTP, NM_ESPNOW };

void netmon_init(void);
void netmon_arm(bool on);
bool netmon_armed(void);

/* Enregistre une trame (no-op si désarmé). `summary` façon printf. worker = 0 si inconnu. */
void netmon_record(uint8_t dir, uint8_t proto, uint8_t worker, const char *ip, uint16_t len, const char *fmt, ...)
    __attribute__((format(printf, 6, 7)));

/* Met à jour la gigue et la perte d'un worker à partir de l'instant d'arrivée d'un battement. */
void netmon_note_heartbeat(uint8_t worker, int64_t arrival_ms);

/* Trames de seq > `since` (max le contenu de l'anneau) ; renvoie le dernier seq. */
uint32_t netmon_frames_json(cJSON *arr, uint32_t since);
void netmon_metrics_json(cJSON *arr);
/* Résumé léger pour l'état WebSocket : {armed,total,worst_jitter}. */
void netmon_summary_json(cJSON *obj);
