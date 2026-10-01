# Enregistreur de données climatiques

Température, humidité et pression journalisées toutes les 10 s dans un CSV lisible par Excel.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | BME280 | VCC | rouge |  |
| GND | BME280 | GND | noir |  |
| GPIO21 | BME280 | SDA | gris-bleu |  |
| GPIO22 | BME280 | SCL | turquoise |  |
| 3V3 | Horloge temps réel DS3231 | VCC | rouge |  |
| GND | Horloge temps réel DS3231 | GND | noir |  |
| GPIO21 | Horloge temps réel DS3231 | SDA | gris-bleu |  |
| GPIO22 | Horloge temps réel DS3231 | SCL | turquoise |  |
| 3V3 | Module carte microSD (SPI) | VCC | rouge |  |
| GND | Module carte microSD (SPI) | GND | noir |  |
| GPIO18 | Module carte microSD (SPI) | SCK | vert |  |
| GPIO19 | Module carte microSD (SPI) | MISO | violet |  |
| GPIO23 | Module carte microSD (SPI) | MOSI | rose |  |
| GPIO4 | Module carte microSD (SPI) | CS | bleu |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
