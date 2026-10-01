# SI1145 / SI1151 (UV, visible, IR)

Capteur Silicon Labs : indice UV calculé, lumière visible et infrarouge.

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SI1145 / SI1151 (UV, visible, IR) | VCC | 3V3 |  |
| SI1145 / SI1151 (UV, visible, IR) | GND | GND |  |
| SI1145 / SI1151 (UV, visible, IR) | SDA | GPIO21 |  |
| SI1145 / SI1151 (UV, visible, IR) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SI1145 Library** 1.2.2 — https://github.com/adafruit/Adafruit_SI1145_Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `si1145_uvi` : Indice UV
- `si1145_vis` : Visible
- `si1145_ir` : Infrarouge

## Utilisation

1. Ouvrez `si1145.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
