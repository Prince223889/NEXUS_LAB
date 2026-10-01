#pragma once
#include <stdbool.h>
#include <stddef.h>

void agent_start(void);
/* Répond à une question. allow_online=false force le mode local (visiteurs non connectés).
 * La réponse est un objet JSON {answer, mode, actions[]} écrit dans json_out. */
void agent_chat(const char *question, bool allow_online, char *json_out, size_t cap);
