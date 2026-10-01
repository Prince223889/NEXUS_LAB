# Si7021

Capteur Silicon Labs avec chauffage intégré et numéro de série.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Si7021 | VCC | rouge |  |
| GND | Si7021 | GND | noir |  |
| GPIO21 | Si7021 | SDA | bleu |  |
| GPIO22 | Si7021 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
