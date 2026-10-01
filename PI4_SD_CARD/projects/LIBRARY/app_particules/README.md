# Moniteur de particules fines PM2.5

PM1/PM2.5/PM10 en µg/m³ sur OLED, web et tableau de bord du MASTER.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 120 mA (pointe 120 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| PMS5003 / PMS7003 (particules fines) | VCC | 5V (VIN) |  |
| PMS5003 / PMS7003 (particules fines) | GND | GND |  |
| PMS5003 / PMS7003 (particules fines) | TX du capteur | GPIO16 |  |
| PMS5003 / PMS7003 (particules fines) | RX du capteur | GPIO17 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pms_pm1` : PM1.0 (µg/m³)
- `pms_pm25` : PM2.5 (µg/m³)
- `pms_pm10` : PM10 (µg/m³)

## Utilisation

1. Ouvrez `app_particules.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
