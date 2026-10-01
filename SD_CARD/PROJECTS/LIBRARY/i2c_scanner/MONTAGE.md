# Scanner I2C (diagnostic)

Liste les adresses I2C présentes sur le bus et identifie les puces courantes.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Scanner I2C (diagnostic) | VCC | rouge |  |
| GND | Scanner I2C (diagnostic) | GND | noir |  |
| GPIO21 | Scanner I2C (diagnostic) | SDA | bleu |  |
| GPIO22 | Scanner I2C (diagnostic) | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
