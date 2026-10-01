# LPS22HB

Baromètre STMicroelectronics 260-1260 hPa, très faible consommation.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | LPS22HB | VCC | rouge |  |
| GND | LPS22HB | GND | noir |  |
| GPIO21 | LPS22HB | SDA | bleu |  |
| GPIO22 | LPS22HB | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
