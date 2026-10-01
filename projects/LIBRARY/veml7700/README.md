# VEML7700

Luxmètre Vishay 16 bits de 0 à 120 000 lx avec correction de non-linéarité.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| VEML7700 | VCC | 3V3 |  |
| VEML7700 | GND | GND |  |
| VEML7700 | SDA | GPIO21 |  |
| VEML7700 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit VEML7700 Library** 2.1.6 — https://github.com/adafruit/Adafruit_VEML7700
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `veml7700_lux` : Éclairement (lx)
- `veml7700_white` : Canal blanc

## Utilisation

1. Ouvrez `veml7700.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
