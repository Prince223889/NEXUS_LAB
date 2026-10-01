# BMP280

Baromètre Bosch : pression (±1 hPa), température et altitude.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BMP280 | VCC | 3V3 |  |
| BMP280 | GND | GND |  |
| BMP280 | SDA | GPIO21 |  |
| BMP280 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit BMP280 Library** 3.0.0 — https://github.com/adafruit/Adafruit_BMP280_Library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bmp280_temp` : Température (°C)
- `bmp280_press` : Pression (hPa)
- `bmp280_alt` : Altitude (m)

## Utilisation

1. Ouvrez `bmp280.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
