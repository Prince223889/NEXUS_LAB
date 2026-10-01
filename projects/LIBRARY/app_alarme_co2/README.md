# Alarme CO₂ avec buzzer

Buzzer au-delà de 1500 ppm, affichage LCD du CO₂, de la température et de l'humidité.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 74 mA (pointe 130 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SCD30 (CO₂ NDIR) | VCC | 3V3 |  |
| SCD30 (CO₂ NDIR) | GND | GND |  |
| SCD30 (CO₂ NDIR) | SDA | GPIO21 |  |
| SCD30 (CO₂ NDIR) | SCL | GPIO22 |  |
| Buzzer actif 5 V | VCC | 3V3 |  |
| Buzzer actif 5 V | GND | GND |  |
| Buzzer actif 5 V | + (via transistor si > 20 mA) | GPIO4 |  |
| Écran LCD 16×2 + module I2C | VCC | 5V (VIN) |  |
| Écran LCD 16×2 + module I2C | GND | GND |  |
| Écran LCD 16×2 + module I2C | SDA | GPIO21 |  |
| Écran LCD 16×2 + module I2C | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SCD30** 1.0.11 — https://github.com/adafruit/Adafruit_SCD30
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **LiquidCrystal I2C** 1.1.2 — https://github.com/johnrickman/LiquidCrystal_I2C

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `scd30_co2` : CO₂ (ppm)
- `scd30_temp` : Température (°C)
- `scd30_hum` : Humidité (%)

## Utilisation

1. Ouvrez `app_alarme_co2.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
