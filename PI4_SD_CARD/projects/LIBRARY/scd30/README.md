# SCD30 (CO₂ NDIR)

Vrai capteur CO₂ infrarouge Sensirion (400-10 000 ppm) + température et humidité.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 19 mA (pointe 75 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SCD30 (CO₂ NDIR) | VCC | 3V3 |  |
| SCD30 (CO₂ NDIR) | GND | GND |  |
| SCD30 (CO₂ NDIR) | SDA | GPIO21 |  |
| SCD30 (CO₂ NDIR) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SCD30** 1.0.11 — https://github.com/adafruit/Adafruit_SCD30
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `scd30_co2` : CO₂ (ppm)
- `scd30_temp` : Température (°C)
- `scd30_hum` : Humidité (%)

## Points d'attention

- Aérez régulièrement : > 1000 ppm = air confiné, > 1500 ppm = aération nécessaire.

## Utilisation

1. Ouvrez `scd30.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
