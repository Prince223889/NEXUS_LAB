# LTR390 (UV + lumière)

Capteur Lite-On : indice UV et lumière ambiante.

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LTR390 (UV + lumière) | VCC | 3V3 |  |
| LTR390 (UV + lumière) | GND | GND |  |
| LTR390 (UV + lumière) | SDA | GPIO21 |  |
| LTR390 (UV + lumière) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit LTR390 Library** 1.1.2 — https://github.com/adafruit/Adafruit_LTR390
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ltr390_uvi` : Indice UV
- `ltr390_uvs` : UVS brut

## Utilisation

1. Ouvrez `ltr390.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
