# LIS3DH

Accéléromètre ST ±2-16 g très basse consommation, avec détection de clic.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LIS3DH | VCC | 3V3 |  |
| LIS3DH | GND | GND |  |
| LIS3DH | SDA | GPIO21 |  |
| LIS3DH | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit LIS3DH** 1.3.0 — https://github.com/adafruit/Adafruit_LIS3DH
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `lis3dh_ax` : Accél. X (m/s²)
- `lis3dh_ay` : Accél. Y (m/s²)
- `lis3dh_az` : Accél. Z (m/s²)

## Utilisation

1. Ouvrez `lis3dh.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
