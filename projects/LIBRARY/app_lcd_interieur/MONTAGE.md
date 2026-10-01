# Afficheur de confort intérieur (LCD)

Température et humidité sur un écran LCD 16×2 : le premier projet « utile » à offrir.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | AHT10 / AHT20 / AHT21 | VCC | rouge |  |
| GND | AHT10 / AHT20 / AHT21 | GND | noir |  |
| GPIO21 | AHT10 / AHT20 / AHT21 | SDA | bleu |  |
| GPIO22 | AHT10 / AHT20 / AHT21 | SCL | vert |  |
| 5V (VIN) | Écran LCD 16×2 + module I2C | VCC | orange |  |
| GND | Écran LCD 16×2 + module I2C | GND | noir |  |
| GPIO21 | Écran LCD 16×2 + module I2C | SDA | bleu |  |
| GPIO22 | Écran LCD 16×2 + module I2C | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
