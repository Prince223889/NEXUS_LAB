# TMP117

Thermomètre de précision médicale ±0,1 °C.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| TMP117 | VCC | 3V3 |  |
| TMP117 | GND | GND |  |
| TMP117 | SDA | GPIO21 |  |
| TMP117 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit TMP117** 1.0.5 — https://github.com/adafruit/Adafruit_TMP117
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tmp117_temp` : Température (°C)

## Utilisation

1. Ouvrez `tmp117.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
