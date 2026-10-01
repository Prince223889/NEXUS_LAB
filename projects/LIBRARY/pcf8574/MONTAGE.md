# PCF8574 (8 E/S I2C)

Extension 8 E/S quasi-bidirectionnelles (le module des écrans LCD I2C).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | PCF8574 (8 E/S I2C) | VCC | rouge |  |
| GND | PCF8574 (8 E/S I2C) | GND | noir |  |
| GPIO21 | PCF8574 (8 E/S I2C) | SDA | bleu |  |
| GPIO22 | PCF8574 (8 E/S I2C) | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
