# MAX31855 + thermocouple K

Convertisseur thermocouple K moderne : -200 à 1350 °C, compensation de soudure froide.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1.5 mA (pointe 1.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MAX31855 + thermocouple K | VCC | 3V3 |  |
| MAX31855 + thermocouple K | GND | GND |  |
| MAX31855 + thermocouple K | SCK | GPIO18 |  |
| MAX31855 + thermocouple K | SO/MISO | GPIO19 |  |
| MAX31855 + thermocouple K | SDI/MOSI | GPIO23 |  |
| MAX31855 + thermocouple K | CS | GPIO4 |  |

## Bibliothèques

- **Adafruit MAX31855 library** 1.4.2 — https://github.com/adafruit/Adafruit-MAX31855-library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `max31855_temp` : Température (°C)
- `max31855_cold` : Soudure froide (°C)

## Utilisation

1. Ouvrez `max31855.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
