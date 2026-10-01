# Horloge temps réel DS3231

Horloge compensée en température (±2 ppm, ~1 min/an) avec pile CR2032 et EEPROM AT24C32.

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Horloge temps réel DS3231 | VCC | 3V3 |  |
| Horloge temps réel DS3231 | GND | GND |  |
| Horloge temps réel DS3231 | SDA | GPIO21 |  |
| Horloge temps réel DS3231 | SCL | GPIO22 |  |

## Bibliothèques

- **RTClib** 2.1.4 — https://github.com/adafruit/RTClib
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ds3231_epoch` : Secondes depuis minuit (s)
- `ds3231_temp` : Température puce (°C)

## Utilisation

1. Ouvrez `ds3231.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
