#pragma once
/* LED RGB d'état (WS2812 intégrée).
 * Modes : boot, ready, work, flash, update, warn, error, offline, storage, network, identify, off */
void led_status_init(void);
void led_status_mode(const char *mode);
const char *led_status_current(void);
void led_status_set(unsigned r, unsigned g, unsigned b);
