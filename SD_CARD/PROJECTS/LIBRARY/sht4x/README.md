# SHT40 / SHT41 / SHT45

Génération 4 Sensirion : ±0,2 °C, ±1,8 % HR, très faible consommation.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SHT40 / SHT41 / SHT45 | VCC | 3V3 |  |
| SHT40 / SHT41 / SHT45 | GND | GND |  |
| SHT40 / SHT41 / SHT45 | SDA | GPIO21 |  |
| SHT40 / SHT41 / SHT45 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SHT4x Library** 1.0.5 — https://github.com/adafruit/Adafruit_SHT4X
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sht4x_temp` : Température (°C)
- `sht4x_hum` : Humidité (%)

## Utilisation

1. Ouvrez `sht4x.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
