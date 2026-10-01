# LSM6DS3TR-C

IMU 6 axes ST : accéléromètre et gyroscope avec podomètre matériel.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LSM6DS3TR-C | VCC | 3V3 |  |
| LSM6DS3TR-C | GND | GND |  |
| LSM6DS3TR-C | SDA | GPIO21 |  |
| LSM6DS3TR-C | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit LSM6DS** 4.7.4 — https://github.com/adafruit/Adafruit_LSM6DS
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `lsm6ds3_ax` : Accél. X (m/s²)
- `lsm6ds3_ay` : Accél. Y (m/s²)
- `lsm6ds3_az` : Accél. Z (m/s²)
- `lsm6ds3_gx` : Gyro X (°/s)
- `lsm6ds3_gy` : Gyro Y (°/s)
- `lsm6ds3_gz` : Gyro Z (°/s)

## Utilisation

1. Ouvrez `lsm6ds3.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
