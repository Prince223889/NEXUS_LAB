#pragma once
#include <stdbool.h>
#include <stddef.h>

void reports_init(void);
void reports_start(void);
/* Écrit un rapport JSON complet sur la microSD ; renvoie le chemin dans path_out. */
bool reports_write_snapshot(const char *kind, char *path_out, size_t cap);
