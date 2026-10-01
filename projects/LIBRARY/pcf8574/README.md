# PCF8574 (8 E/S I2C)

Extension 8 E/S quasi-bidirectionnelles (le module des écrans LCD I2C).

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| PCF8574 (8 E/S I2C) | VCC | 3V3 |  |
| PCF8574 (8 E/S I2C) | GND | GND |  |
| PCF8574 (8 E/S I2C) | SDA | GPIO21 |  |
| PCF8574 (8 E/S I2C) | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pcf_inputs` : Entrées P4-P7

## Utilisation

1. Ouvrez `pcf8574.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
