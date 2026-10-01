# Horloge précise DS3231 + OLED

Heure conservée sur pile, température de la puce, affichage OLED.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 21 mA (pointe 21 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Horloge temps réel DS3231 | VCC | 3V3 |  |
| Horloge temps réel DS3231 | GND | GND |  |
| Horloge temps réel DS3231 | SDA | GPIO21 |  |
| Horloge temps réel DS3231 | SCL | GPIO22 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **RTClib** 2.1.4 — https://github.com/adafruit/RTClib
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ds3231_epoch` : Secondes depuis minuit (s)
- `ds3231_temp` : Température puce (°C)

## Utilisation

1. Ouvrez `app_horloge_rtc.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
