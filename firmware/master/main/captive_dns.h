#pragma once
#include <stdbool.h>

/* Mini serveur DNS « portail captif » : toute requête A reçue sur le point d'accès
 * est résolue vers 192.168.4.1, ce qui ouvre automatiquement le dashboard
 * sur les téléphones (« Se connecter au réseau »). */
void captive_dns_start(void);
void captive_dns_stop(void);
bool captive_dns_running(void);
