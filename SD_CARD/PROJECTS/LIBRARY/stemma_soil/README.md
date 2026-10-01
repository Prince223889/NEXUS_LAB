# Adafruit STEMMA Soil Sensor (seesaw)

Sonde capacitive I2C : humidité du sol et température, sans ADC.

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Adafruit STEMMA Soil Sensor (seesaw) | VCC | 3V3 |  |
| Adafruit STEMMA Soil Sensor (seesaw) | GND | GND |  |
| Adafruit STEMMA Soil Sensor (seesaw) | SDA | GPIO21 |  |
| Adafruit STEMMA Soil Sensor (seesaw) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit seesaw Library** 1.7.9 — https://github.com/adafruit/Adafruit_seesaw
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ssoil_moist` : Humidité du sol (%)
- `ssoil_cap` : Capacité brute
- `ssoil_temp` : Température (°C)

## Utilisation

1. Ouvrez `stemma_soil.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
