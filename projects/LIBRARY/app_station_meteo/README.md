# Station météo intérieure connectée

Température, humidité, pression et luminosité sur écran OLED, page web locale et tableau de bord du MASTER.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 22 mA (pointe 22 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BME280 | VCC | 3V3 |  |
| BME280 | GND | GND |  |
| BME280 | SDA | GPIO21 |  |
| BME280 | SCL | GPIO22 |  |
| BH1750 (GY-30 / GY-302) | VCC | 3V3 |  |
| BH1750 (GY-30 / GY-302) | GND | GND |  |
| BH1750 (GY-30 / GY-302) | SDA | GPIO21 |  |
| BH1750 (GY-30 / GY-302) | SCL | GPIO22 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit BME280 Library** 2.3.0 — https://github.com/adafruit/Adafruit_BME280_Library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **BH1750** 1.3.0 — https://github.com/claws/BH1750
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bme280_temp` : Température (°C)
- `bme280_hum` : Humidité (%)
- `bme280_press` : Pression (hPa)
- `bme280_alt` : Altitude (m)
- `bh1750_lux` : Éclairement (lx)

## Utilisation

1. Ouvrez `app_station_meteo.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
