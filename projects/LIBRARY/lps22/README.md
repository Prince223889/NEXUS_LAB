# LPS22HB

Baromètre STMicroelectronics 260-1260 hPa, très faible consommation.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LPS22HB | VCC | 3V3 |  |
| LPS22HB | GND | GND |  |
| LPS22HB | SDA | GPIO21 |  |
| LPS22HB | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit LPS2X** 2.0.6 — https://github.com/adafruit/Adafruit_LPS2X
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `lps22_press` : Pression (hPa)
- `lps22_temp` : Température (°C)

## Utilisation

1. Ouvrez `lps22.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
