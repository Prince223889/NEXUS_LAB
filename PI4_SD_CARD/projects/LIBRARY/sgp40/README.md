# SGP40 (indice COV)

Indice COV Sensirion de 0 à 500 (100 = moyenne des dernières 24 h).

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 3 mA (pointe 3 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SGP40 (indice COV) | VCC | 3V3 |  |
| SGP40 (indice COV) | GND | GND |  |
| SGP40 (indice COV) | SDA | GPIO21 |  |
| SGP40 (indice COV) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SGP40 Sensor** 1.1.4 — https://github.com/adafruit/Adafruit_SGP40
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sgp40_voc` : Indice COV
- `sgp40_raw` : Brut

## Utilisation

1. Ouvrez `sgp40.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
