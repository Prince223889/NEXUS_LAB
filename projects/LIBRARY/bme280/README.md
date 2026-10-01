# BME280

Station météo miniature Bosch : température, humidité, pression et altitude estimée.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BME280 | VCC | 3V3 |  |
| BME280 | GND | GND |  |
| BME280 | SDA | GPIO21 |  |
| BME280 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit BME280 Library** 2.3.0 — https://github.com/adafruit/Adafruit_BME280_Library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bme280_temp` : Température (°C)
- `bme280_hum` : Humidité (%)
- `bme280_press` : Pression (hPa)
- `bme280_alt` : Altitude (m)

## Points d'attention

- Beaucoup de modules « BME280 » bon marché sont en réalité des BMP280 (sans humidité) : ID 0x58 au lieu de 0x60.

## Utilisation

1. Ouvrez `bme280.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
