# MPU-9250 / MPU-6500

IMU InvenSense lue directement par registres (accéléromètre ±4 g, gyroscope ±500 °/s).

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 4 mA (pointe 4 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MPU-9250 / MPU-6500 | VCC | 3V3 |  |
| MPU-9250 / MPU-6500 | GND | GND |  |
| MPU-9250 / MPU-6500 | SDA | GPIO21 |  |
| MPU-9250 / MPU-6500 | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mpu9250_ax` : Accél. X (m/s²)
- `mpu9250_ay` : Accél. Y (m/s²)
- `mpu9250_az` : Accél. Z (m/s²)
- `mpu9250_gx` : Gyro X (°/s)
- `mpu9250_gy` : Gyro Y (°/s)
- `mpu9250_gz` : Gyro Z (°/s)
- `mpu9250_temp` : Température puce (°C)

## Utilisation

1. Ouvrez `mpu9250.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
