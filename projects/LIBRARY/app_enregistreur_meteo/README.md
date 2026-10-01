# Enregistreur de données climatiques

Température, humidité et pression journalisées toutes les 10 s dans un CSV lisible par Excel.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 52 mA (pointe 102 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BME280 | VCC | 3V3 |  |
| BME280 | GND | GND |  |
| BME280 | SDA | GPIO21 |  |
| BME280 | SCL | GPIO22 |  |
| Horloge temps réel DS3231 | VCC | 3V3 |  |
| Horloge temps réel DS3231 | GND | GND |  |
| Horloge temps réel DS3231 | SDA | GPIO21 |  |
| Horloge temps réel DS3231 | SCL | GPIO22 |  |
| Module carte microSD (SPI) | VCC | 3V3 |  |
| Module carte microSD (SPI) | GND | GND |  |
| Module carte microSD (SPI) | SCK | GPIO18 |  |
| Module carte microSD (SPI) | MISO | GPIO19 |  |
| Module carte microSD (SPI) | MOSI | GPIO23 |  |
| Module carte microSD (SPI) | CS | GPIO4 |  |

## Bibliothèques

- **Adafruit BME280 Library** 2.3.0 — https://github.com/adafruit/Adafruit_BME280_Library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **RTClib** 2.1.4 — https://github.com/adafruit/RTClib

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bme280_temp` : Température (°C)
- `bme280_hum` : Humidité (%)
- `bme280_press` : Pression (hPa)
- `bme280_alt` : Altitude (m)
- `ds3231_epoch` : Secondes depuis minuit (s)
- `ds3231_temp` : Température puce (°C)
- `sd_count` : Lignes écrites
- `sd_used` : Espace utilisé (Ko)

## Utilisation

1. Ouvrez `app_enregistreur_meteo.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
