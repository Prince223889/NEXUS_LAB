#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "cJSON.h"
#include "esp_err.h"

/* Programmation par câble USB (hôte USB du MASTER), en tâche de fond, avec progression et journal
 * consultables par l'interface (« moniteur de flash »).
 *  - Arduino (ATmega328P/168) : fichier .hex, bootloader STK500v1 (usb_avr.c).
 *  - ESP32 / ESP32-S3 / ESP32-C3 : fichier .bin, protocole du bootloader ROM d'Espressif (celui d'esptool).
 *    Si un fichier `flash_args` (produit par arduino-cli) est à côté du .bin, toutes les parties sont écrites
 *    (bootloader, table de partitions, boot_app0, application) comme le fait l'IDE Arduino ; sinon seule
 *    l'application est écrite à 0x10000. Chaque zone est vérifiée par MD5 calculé par la puce. */
esp_err_t usb_flash_start_avr(const char *hex_path, const char *profile, char *err, size_t cap);
esp_err_t usb_flash_start_esp(const char *bin_path, char *err, size_t cap);
bool usb_flash_busy(void);
/* {busy, kind, file, step, progress, ok, result, chip, baud, last, log:[{seq,text}]} ; log depuis `since`. */
void usb_flash_status_json(cJSON *obj, uint32_t since);
