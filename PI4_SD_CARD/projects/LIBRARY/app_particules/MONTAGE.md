# Moniteur de particules fines PM2.5

PM1/PM2.5/PM10 en µg/m³ sur OLED, web et tableau de bord du MASTER.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | PMS5003 / PMS7003 (particules fines) | VCC | orange |  |
| GND | PMS5003 / PMS7003 (particules fines) | GND | noir |  |
| GPIO16 | PMS5003 / PMS7003 (particules fines) | TX du capteur | bleu |  |
| GPIO17 | PMS5003 / PMS7003 (particules fines) | RX du capteur | vert |  |
| 3V3 | Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | rouge |  |
| GND | Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | noir |  |
| GPIO21 | Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | violet |  |
| GPIO22 | Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | gris-bleu |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
