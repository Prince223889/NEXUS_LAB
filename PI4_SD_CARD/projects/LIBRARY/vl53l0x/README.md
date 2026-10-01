# VL53L0X (temps de vol laser)

Télémètre laser ToF 30-1200 mm, précis et insensible à la couleur de la cible.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 19 mA (pointe 19 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| VL53L0X (temps de vol laser) | VCC | 3V3 |  |
| VL53L0X (temps de vol laser) | GND | GND |  |
| VL53L0X (temps de vol laser) | SDA | GPIO21 |  |
| VL53L0X (temps de vol laser) | SCL | GPIO22 |  |
| VL53L0X (temps de vol laser) | XSHUT | GPIO4 | pour changer d'adresse avec plusieurs capteurs |

## Bibliothèques

- **Adafruit_VL53L0X** 1.2.5 — https://github.com/adafruit/Adafruit_VL53L0X

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `vl53l0x_dist` : Distance (cm)

## Utilisation

1. Ouvrez `vl53l0x.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
