# VL6180X (ToF courte portée + lux)

Mesure de 5 à 200 mm au millimètre près, plus un capteur de lumière ambiante.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 2 mA (pointe 2 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| VL6180X (ToF courte portée + lux) | VCC | 3V3 |  |
| VL6180X (ToF courte portée + lux) | GND | GND |  |
| VL6180X (ToF courte portée + lux) | SDA | GPIO21 |  |
| VL6180X (ToF courte portée + lux) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit_VL6180X** 1.4.4 — https://github.com/adafruit/Adafruit_VL6180X

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `vl6180x_dist` : Distance (cm)
- `vl6180x_lux` : Lumière (lx)

## Utilisation

1. Ouvrez `vl6180x.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
