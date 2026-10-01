#pragma once
#include <stdbool.h>
/* Pilote DHT11 / DHT22 (AM2302) sur une broche GPIO, mesure des impulsions au microseconde près. */
bool dht_read(int gpio, int type, float *temp_c, float *humidity);
