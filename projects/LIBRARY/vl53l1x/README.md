# VL53L1X (ToF longue portée)

Télémètre laser ToF jusqu'à 4 m, mesure continue 50 Hz.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 18 mA (pointe 18 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| VL53L1X (ToF longue portée) | VCC | 3V3 |  |
| VL53L1X (ToF longue portée) | GND | GND |  |
| VL53L1X (ToF longue portée) | SDA | GPIO21 |  |
| VL53L1X (ToF longue portée) | SCL | GPIO22 |  |

## Bibliothèques

- **VL53L1X** 1.3.1 — https://github.com/pololu/vl53l1x-arduino

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `vl53l1x_dist` : Distance (cm)

## Utilisation

1. Ouvrez `vl53l1x.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
