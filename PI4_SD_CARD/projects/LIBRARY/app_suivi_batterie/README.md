# Suivi d'une batterie / panneau solaire

Tension, courant et puissance mesurés par INA219, enregistrés sur carte SD.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 63 mA (pointe 113 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| INA219 (tension/courant/puissance) | VCC | 3V3 |  |
| INA219 (tension/courant/puissance) | GND | GND |  |
| INA219 (tension/courant/puissance) | SDA | GPIO21 |  |
| INA219 (tension/courant/puissance) | SCL | GPIO22 |  |
| Module carte microSD (SPI) | VCC | 3V3 |  |
| Module carte microSD (SPI) | GND | GND |  |
| Module carte microSD (SPI) | SCK | GPIO18 |  |
| Module carte microSD (SPI) | MISO | GPIO19 |  |
| Module carte microSD (SPI) | MOSI | GPIO23 |  |
| Module carte microSD (SPI) | CS | GPIO4 |  |
| Écran OLED 0,91" SSD1306 128×32 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,91" SSD1306 128×32 (I2C) | GND | GND |  |
| Écran OLED 0,91" SSD1306 128×32 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,91" SSD1306 128×32 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit INA219** 1.1.0 — https://github.com/adafruit/Adafruit_INA219
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ina219_volt` : Tension (V)
- `ina219_curr` : Courant (mA)
- `ina219_power` : Puissance (mW)
- `sd_count` : Lignes écrites
- `sd_used` : Espace utilisé (Ko)

## Utilisation

1. Ouvrez `app_suivi_batterie.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
