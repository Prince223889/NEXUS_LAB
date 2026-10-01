#pragma once
#include <stdbool.h>
#include <stddef.h>

/* Notifications sortantes (WhatsApp via CallMeBot, webhook JSON Discord/Slack/ntfy…).
 * notifications_send() met le message en file et revient immédiatement. */
void notifications_start(void);
bool notifications_configured(void);
bool notifications_send(const char *text);
/* Envoi synchrone utilisé par le bouton « Tester » ; écrit un JSON dans out. */
void notifications_test(char *out, size_t cap);
