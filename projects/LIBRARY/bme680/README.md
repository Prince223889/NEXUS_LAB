# BME680

Capteur 4-en-1 : température, humidité, pression et résistance de gaz (qualité de l'air / COV).

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 12 mA (pointe 12 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BME680 | VCC | 3V3 |  |
| BME680 | GND | GND |  |
| BME680 | SDA | GPIO21 |  |
| BME680 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit BME680 Library** 2.0.6 — https://github.com/adafruit/Adafruit_BME680
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bme680_temp` : Température (°C)
- `bme680_hum` : Humidité (%)
- `bme680_press` : Pression (hPa)
- `bme680_gas` : Résistance gaz (kΩ)

## Points d'attention

- La résistance de gaz augmente quand l'air est plus propre ; laissez chauffer 30 min pour une mesure stable.

## Utilisation

1. Ouvrez `bme680.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
