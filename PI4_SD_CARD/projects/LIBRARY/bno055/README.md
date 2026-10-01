# BNO055 (orientation absolue 9 axes)

IMU Bosch avec fusion de capteurs intégrée : cap, roulis et tangage directement en degrés.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 12 mA (pointe 12 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BNO055 (orientation absolue 9 axes) | VCC | 3V3 |  |
| BNO055 (orientation absolue 9 axes) | GND | GND |  |
| BNO055 (orientation absolue 9 axes) | SDA | GPIO21 |  |
| BNO055 (orientation absolue 9 axes) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit BNO055** 1.6.4 — https://github.com/adafruit/Adafruit_BNO055
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bno055_heading` : Cap (°)
- `bno055_roll` : Roulis (°)
- `bno055_pitch` : Tangage (°)
- `bno055_calib` : Étalonnage (0-3)

## Points d'attention

- Bougez le capteur en 8 pour étalonner le magnétomètre (calib = 3).
- Le BNO055 étire l'horloge I2C : évitez les bus à 400 kHz.

## Utilisation

1. Ouvrez `bno055.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
