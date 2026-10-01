# HDC1080

Capteur Texas Instruments (±0,2 °C, ±2 % HR), piloté ici directement par registres.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | HDC1080 | VCC | rouge |  |
| GND | HDC1080 | GND | noir |  |
| GPIO21 | HDC1080 | SDA | bleu |  |
| GPIO22 | HDC1080 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
