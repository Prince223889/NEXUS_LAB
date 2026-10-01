# Niveau à bulle numérique

Roulis et tangage en degrés sur écran OLED grâce au MPU-6050.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 24 mA (pointe 24 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MPU-6050 (GY-521) | VCC | 3V3 |  |
| MPU-6050 (GY-521) | GND | GND |  |
| MPU-6050 (GY-521) | SDA | GPIO21 |  |
| MPU-6050 (GY-521) | SCL | GPIO22 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit MPU6050** 2.2.9 — https://github.com/adafruit/Adafruit_MPU6050
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mpu6050_ax` : Accél. X (m/s²)
- `mpu6050_ay` : Accél. Y (m/s²)
- `mpu6050_az` : Accél. Z (m/s²)
- `mpu6050_gx` : Gyro X (°/s)
- `mpu6050_gy` : Gyro Y (°/s)
- `mpu6050_gz` : Gyro Z (°/s)
- `mpu6050_roll` : Roulis (°)
- `mpu6050_pitch` : Tangage (°)

## Utilisation

1. Ouvrez `app_niveau_bulle.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
