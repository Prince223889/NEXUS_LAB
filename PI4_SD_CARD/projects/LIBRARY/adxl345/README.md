# ADXL345 (GY-291)

Accéléromètre 3 axes ±2 à ±16 g, détection de chute libre et de tapotement.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| ADXL345 (GY-291) | VCC | 3V3 |  |
| ADXL345 (GY-291) | GND | GND |  |
| ADXL345 (GY-291) | SDA | GPIO21 |  |
| ADXL345 (GY-291) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit ADXL345** 1.3.4 — https://github.com/adafruit/Adafruit_ADXL345
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `adxl345_ax` : Accél. X (m/s²)
- `adxl345_ay` : Accél. Y (m/s²)
- `adxl345_az` : Accél. Z (m/s²)

## Utilisation

1. Ouvrez `adxl345.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
