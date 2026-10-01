# TSL2591

Luxmètre à très haute dynamique (188 µlx à 88 000 lx), mesure de nuit comme en plein soleil.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | TSL2591 | VCC | rouge |  |
| GND | TSL2591 | GND | noir |  |
| GPIO21 | TSL2591 | SDA | bleu |  |
| GPIO22 | TSL2591 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
