#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "cJSON.h"
#include "esp_err.h"

/* Veille du labo : surveillance, à visage découvert, du SEUL matériel de l'utilisateur.
 *  - appareils associés au point d'accès Wi-Fi du box : alerte si un appareil inconnu s'y connecte ;
 *  - workers qui s'éteignent ou reviennent ;
 *  - alarmes de capteurs branchés sur ses propres workers (mouvement, porte, gaz…), règle « flux > seuil ».
 * Journal des alertes + notification sortante (si configurée) + indicateur « Veille active » dans l'interface.
 * Ne capte aucun trafic, aucun contenu, aucun son ni image : seule l'adresse MAC des appareils associés au
 * point d'accès du box est connue (comme la liste des clients d'une box Internet). Désarmée par défaut. */

#define VEILLE_RULES_MAX 8

void veille_start(void);
/* Appelé par wifi_lab à l'association / dissociation d'un appareil au point d'accès. */
void veille_station(const uint8_t mac[6], bool connected);
esp_err_t veille_arm(bool on);
bool veille_armed(void);
/* Appareil connu (nommé) ou oublié. mac au format AA:BB:CC:DD:EE:FF. */
esp_err_t veille_set_known(const char *mac, const char *name, bool known);
/* Règle de capteur : idx < 0 pour ajouter. op : '>' '<' '='. */
esp_err_t veille_set_rule(int idx, const char *source, const char *key, char op, float value, const char *label);
esp_err_t veille_del_rule(int idx);
/* {armed, armed_age_s, last, alerts:[…since], stations:[…], known:[…], rules:[…]} */
void veille_status_json(cJSON *obj, uint32_t since);
/* Résumé pour /api/state : {armed, last, count}. */
void veille_summary_json(cJSON *obj);
