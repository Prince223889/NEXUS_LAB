# Niveau à bulle numérique

Roulis et tangage en degrés sur écran OLED grâce au MPU-6050.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | MPU-6050 (GY-521) | VCC | rouge |  |
| GND | MPU-6050 (GY-521) | GND | noir |  |
| GPIO21 | MPU-6050 (GY-521) | SDA | bleu |  |
| GPIO22 | MPU-6050 (GY-521) | SCL | vert |  |
| 3V3 | Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | rouge |  |
| GND | Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | noir |  |
| GPIO21 | Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | bleu |  |
| GPIO22 | Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
