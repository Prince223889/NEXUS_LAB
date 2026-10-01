# MCP4725 (CNA 12 bits I2C)

Sortie de tension analogique 12 bits (0-VCC) avec mémoire EEPROM de la valeur au démarrage.

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MCP4725 (CNA 12 bits I2C) | VCC | 3V3 |  |
| MCP4725 (CNA 12 bits I2C) | GND | GND |  |
| MCP4725 (CNA 12 bits I2C) | SDA | GPIO21 |  |
| MCP4725 (CNA 12 bits I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit MCP4725** 2.0.2 — https://github.com/adafruit/Adafruit_MCP4725
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `mcp4725.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
