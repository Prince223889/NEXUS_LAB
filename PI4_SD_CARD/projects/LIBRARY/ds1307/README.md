# Horloge temps réel DS1307 (Tiny RTC)

Horloge économique avec pile (dérive ~1 s/jour).

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Horloge temps réel DS1307 (Tiny RTC) | VCC | 5V (VIN) |  |
| Horloge temps réel DS1307 (Tiny RTC) | GND | GND |  |
| Horloge temps réel DS1307 (Tiny RTC) | SDA | GPIO21 |  |
| Horloge temps réel DS1307 (Tiny RTC) | SCL | GPIO22 |  |

## Bibliothèques

- **RTClib** 2.1.4 — https://github.com/adafruit/RTClib
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ds1307_epoch` : Secondes depuis minuit (s)

## Utilisation

1. Ouvrez `ds1307.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
