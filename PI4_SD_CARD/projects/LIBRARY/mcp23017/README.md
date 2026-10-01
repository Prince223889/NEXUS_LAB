# MCP23017 (16 E/S I2C)

Ajoute 16 entrées/sorties numériques par I2C (jusqu'à 8 puces, 128 E/S).

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MCP23017 (16 E/S I2C) | VCC | 3V3 |  |
| MCP23017 (16 E/S I2C) | GND | GND |  |
| MCP23017 (16 E/S I2C) | SDA | GPIO21 |  |
| MCP23017 (16 E/S I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit MCP23017 Arduino Library** 2.3.2 — https://github.com/adafruit/Adafruit-MCP23017-Arduino-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mcp_inputs` : Entrées GPB (masque)

## Utilisation

1. Ouvrez `mcp23017.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
