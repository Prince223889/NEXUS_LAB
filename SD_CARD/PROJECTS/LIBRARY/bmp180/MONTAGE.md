# BMP180 / BMP085

Ancien baromètre Bosch, encore très répandu dans les kits.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | BMP180 / BMP085 | VCC | rouge |  |
| GND | BMP180 / BMP085 | GND | noir |  |
| GPIO21 | BMP180 / BMP085 | SDA | bleu |  |
| GPIO22 | BMP180 / BMP085 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
