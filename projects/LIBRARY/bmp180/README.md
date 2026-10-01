# BMP180 / BMP085

Ancien baromètre Bosch, encore très répandu dans les kits.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BMP180 / BMP085 | VCC | 3V3 |  |
| BMP180 / BMP085 | GND | GND |  |
| BMP180 / BMP085 | SDA | GPIO21 |  |
| BMP180 / BMP085 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit BMP085 Library** 1.2.4 — https://github.com/adafruit/Adafruit-BMP085-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bmp180_temp` : Température (°C)
- `bmp180_press` : Pression (hPa)

## Utilisation

1. Ouvrez `bmp180.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
