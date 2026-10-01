# VEML6070 (UV-A)

Capteur UV-A Vishay (320-410 nm).

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| VEML6070 (UV-A) | VCC | 3V3 |  |
| VEML6070 (UV-A) | GND | GND |  |
| VEML6070 (UV-A) | SDA | GPIO21 |  |
| VEML6070 (UV-A) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit VEML6070 Library** 1.0.8 — https://github.com/adafruit/Adafruit_VEML6070

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `veml6070_level` : Niveau UV brut

## Points d'attention

- Occupe aussi les adresses 0x39 et 0x3A : incompatible avec l'AHT20 (0x38) sur le même bus.

## Utilisation

1. Ouvrez `veml6070.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
