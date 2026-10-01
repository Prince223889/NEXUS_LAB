# Afficheur 4 chiffres HT16K33 (I2C)

Afficheur 7 segments « backpack » Adafruit sur I2C.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Afficheur 4 chiffres HT16K33 (I2C) | VCC | rouge |  |
| GND | Afficheur 4 chiffres HT16K33 (I2C) | GND | noir |  |
| GPIO21 | Afficheur 4 chiffres HT16K33 (I2C) | SDA | bleu |  |
| GPIO22 | Afficheur 4 chiffres HT16K33 (I2C) | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
