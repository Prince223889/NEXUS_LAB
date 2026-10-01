# BMP280

Baromètre Bosch : pression (±1 hPa), température et altitude.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | BMP280 | VCC | rouge |  |
| GND | BMP280 | GND | noir |  |
| GPIO21 | BMP280 | SDA | bleu |  |
| GPIO22 | BMP280 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
