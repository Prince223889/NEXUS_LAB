# Écran LCD 20×4 + module I2C

Grand écran texte 4 lignes de 20 caractères.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | Écran LCD 20×4 + module I2C | VCC | orange |  |
| GND | Écran LCD 20×4 + module I2C | GND | noir |  |
| GPIO21 | Écran LCD 20×4 + module I2C | SDA | bleu |  |
| GPIO22 | Écran LCD 20×4 + module I2C | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
