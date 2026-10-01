# AHT10 / AHT20 / AHT21

Capteur Aosong économique et précis (±0,3 °C, ±2 % HR), souvent couplé au BMP280.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| AHT10 / AHT20 / AHT21 | VCC | 3V3 |  |
| AHT10 / AHT20 / AHT21 | GND | GND |  |
| AHT10 / AHT20 / AHT21 | SDA | GPIO21 |  |
| AHT10 / AHT20 / AHT21 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit AHTX0** 2.0.6 — https://github.com/adafruit/Adafruit_AHTX0
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `aht20_temp` : Température (°C)
- `aht20_hum` : Humidité (%)

## Utilisation

1. Ouvrez `aht20.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
