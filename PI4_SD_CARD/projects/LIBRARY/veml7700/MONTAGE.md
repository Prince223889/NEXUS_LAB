# VEML7700

Luxmètre Vishay 16 bits de 0 à 120 000 lx avec correction de non-linéarité.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | VEML7700 | VCC | rouge |  |
| GND | VEML7700 | GND | noir |  |
| GPIO21 | VEML7700 | SDA | bleu |  |
| GPIO22 | VEML7700 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
