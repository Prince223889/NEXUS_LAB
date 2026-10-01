# Si7021

Capteur Silicon Labs avec chauffage intégré et numéro de série.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Si7021 | VCC | 3V3 |  |
| Si7021 | GND | GND |  |
| Si7021 | SDA | GPIO21 |  |
| Si7021 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit Si7021 Library** 1.5.3 — https://github.com/adafruit/Adafruit_Si7021
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `si7021_temp` : Température (°C)
- `si7021_hum` : Humidité (%)

## Utilisation

1. Ouvrez `si7021.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
