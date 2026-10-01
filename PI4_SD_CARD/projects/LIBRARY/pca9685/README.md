# PCA9685 (16 servos I2C)

Contrôleur 16 voies PWM 12 bits : bras robot, hexapode, jeux de lumière.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 10 mA (pointe 10 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| PCA9685 (16 servos I2C) | VCC | 3V3 |  |
| PCA9685 (16 servos I2C) | GND | GND |  |
| PCA9685 (16 servos I2C) | SDA | GPIO21 |  |
| PCA9685 (16 servos I2C) | SCL | GPIO22 |  |
| PCA9685 (16 servos I2C) | V+ (bornier) | alimentation 5-6 V des servos |  |

## Bibliothèques

- **Adafruit PWM Servo Driver Library** 3.0.3 — https://github.com/adafruit/Adafruit-PWM-Servo-Driver-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `pca9685.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
