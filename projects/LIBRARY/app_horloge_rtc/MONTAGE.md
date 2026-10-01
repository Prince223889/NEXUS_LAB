# Horloge précise DS3231 + OLED

Heure conservée sur pile, température de la puce, affichage OLED.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Horloge temps réel DS3231 | VCC | rouge |  |
| GND | Horloge temps réel DS3231 | GND | noir |  |
| GPIO21 | Horloge temps réel DS3231 | SDA | bleu |  |
| GPIO22 | Horloge temps réel DS3231 | SCL | vert |  |
| 3V3 | Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | rouge |  |
| GND | Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | noir |  |
| GPIO21 | Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | bleu |  |
| GPIO22 | Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
