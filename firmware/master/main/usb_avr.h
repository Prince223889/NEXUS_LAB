#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "esp_err.h"
#include "cJSON.h"

/* Hôte USB du MASTER : Arduino Uno/Nano/Mega… branché sur le port USB natif.
 * Puces prises en charge : CDC-ACM (ATmega16U2, Leonardo…), CH340/CH341, CP210x, FTDI. */
esp_err_t usb_avr_init(void);
bool usb_avr_ready(void);
void usb_avr_info_json(cJSON *obj);
/* Programmation d'un .hex via le bootloader STK500v1 (Optiboot / ATmegaBOOT). */
esp_err_t usb_avr_flash_hex(const char *path, const char *profile, char *result, size_t cap);
/* Rappel facultatif de progression (0-100 %, étape) appelé pendant usb_avr_flash_hex ; NULL pour désactiver. */
typedef void (*usb_progress_cb_t)(int pct, const char *step);
void usb_avr_set_progress_cb(usb_progress_cb_t cb);
/* Cherche un bootloader Arduino (STK500v1) en essayant chaque profil ; écrit le nom du profil qui répond
 * (signature de l'ATmega vérifiée). ESP_ERR_NOT_FOUND si aucun ne répond. Redémarre ensuite la carte. */
esp_err_t usb_avr_probe(char *profile, size_t cap);
/* Moniteur série. */
esp_err_t usb_serial_set_baud(uint32_t baud);
esp_err_t usb_serial_write(const uint8_t *data, size_t len);
/* Copie les octets reçus depuis la position `since` ; renvoie la nouvelle position. */
uint32_t usb_serial_read(uint32_t since, char *out, size_t cap, size_t *out_len);

/* ---- Liaison brute pour les programmeurs (usb_flash.c). Entre begin et end, les octets reçus vont
 * dans un tampon de programmation au lieu du moniteur. ---- */
esp_err_t usb_link_begin(void);          /* ESP_ERR_INVALID_STATE si pas de carte ou déjà occupé */
void usb_link_end(void);
esp_err_t usb_link_tx(const uint8_t *data, size_t len);
size_t usb_link_rx(uint8_t *out, size_t want, uint32_t timeout_ms);
void usb_link_rx_clear(void);
esp_err_t usb_link_set_baud(uint32_t baud);
void usb_link_set_lines(bool dtr, bool rts);
uint16_t usb_link_vid(void);
uint32_t usb_monitor_baud(void);
