# SHT31

Capteur Sensirion très précis (±0,3 °C, ±2 % HR) avec chauffage intégré anti-condensation.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | SHT31 | VCC | rouge |  |
| GND | SHT31 | GND | noir |  |
| GPIO21 | SHT31 | SDA | bleu |  |
| GPIO22 | SHT31 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
