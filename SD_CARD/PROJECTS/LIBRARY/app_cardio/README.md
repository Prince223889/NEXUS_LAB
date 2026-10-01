# Cardiofréquencemètre à écran

Fréquence cardiaque (MAX30102) affichée en direct sur OLED.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 25 mA (pointe 25 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MAX30102 (pouls & SpO₂) | VCC | 3V3 |  |
| MAX30102 (pouls & SpO₂) | GND | GND |  |
| MAX30102 (pouls & SpO₂) | SDA | GPIO21 |  |
| MAX30102 (pouls & SpO₂) | SCL | GPIO22 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **SparkFun MAX3010x Pulse and Proximity Sensor Library** 1.1.2 — https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `max30102_bpm` : Fréquence cardiaque (BPM)
- `max30102_finger` : Doigt posé

## Utilisation

1. Ouvrez `app_cardio.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
