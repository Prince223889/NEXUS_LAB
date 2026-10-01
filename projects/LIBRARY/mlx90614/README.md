# MLX90614 (thermomètre infrarouge)

Mesure sans contact la température d'un objet (-70 à 380 °C) et la température ambiante.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 2 mA (pointe 2 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MLX90614 (thermomètre infrarouge) | VCC | 3V3 |  |
| MLX90614 (thermomètre infrarouge) | GND | GND |  |
| MLX90614 (thermomètre infrarouge) | SDA | GPIO21 |  |
| MLX90614 (thermomètre infrarouge) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit MLX90614 Library** 2.1.6 — https://github.com/adafruit/Adafruit-MLX90614-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mlx90614_obj` : Objet (°C)
- `mlx90614_amb` : Ambiante (°C)

## Points d'attention

- Champ de vision de 90° : l'objet doit remplir le cône de mesure.
- Le MLX90614 ne supporte pas bien un bus I2C à 400 kHz.

## Utilisation

1. Ouvrez `mlx90614.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
