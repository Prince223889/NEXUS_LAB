#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "cJSON.h"

void job_engine_start(void);
/* Types de jobs acceptés par les workers (tous sans danger pour le matériel). */
bool job_type_valid(const char *type);
int job_create(const char *type, int priority);
int job_create_targeted(const char *type, int priority, uint8_t worker_id);
bool job_cancel(int id);
size_t job_cancel_all(void);
size_t job_clear_finished(void);
void job_to_json(cJSON *arr);
void job_stats(int *queued, int *running, int *done, int *failed);
