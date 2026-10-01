# HTU21D / SHT21 / Si7021 (GY-21)

Capteur température/humidité compatible SHT21, module GY-21.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HTU21D / SHT21 / Si7021 (GY-21) | VCC | 3V3 |  |
| HTU21D / SHT21 / Si7021 (GY-21) | GND | GND |  |
| HTU21D / SHT21 / Si7021 (GY-21) | SDA | GPIO21 |  |
| HTU21D / SHT21 / Si7021 (GY-21) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit HTU21DF Library** 1.1.2 — https://github.com/adafruit/Adafruit_HTU21DF_Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `htu21d_temp` : Température (°C)
- `htu21d_hum` : Humidité (%)

## Utilisation

1. Ouvrez `htu21d.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
