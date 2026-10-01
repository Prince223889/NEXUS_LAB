# MCP9808

Thermomètre numérique ±0,25 °C, 8 adresses possibles (A0-A2).

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MCP9808 | VCC | 3V3 |  |
| MCP9808 | GND | GND |  |
| MCP9808 | SDA | GPIO21 |  |
| MCP9808 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit MCP9808 Library** 2.0.2 — https://github.com/adafruit/Adafruit_MCP9808_Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mcp9808_temp` : Température (°C)

## Utilisation

1. Ouvrez `mcp9808.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
