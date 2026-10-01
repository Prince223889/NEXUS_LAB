# HMC5883L (boussole GY-273)

Magnétomètre 3 axes : cap magnétique en degrés (module d'origine Honeywell).

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HMC5883L (boussole GY-273) | VCC | 3V3 |  |
| HMC5883L (boussole GY-273) | GND | GND |  |
| HMC5883L (boussole GY-273) | SDA | GPIO21 |  |
| HMC5883L (boussole GY-273) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit HMC5883 Unified** 1.2.4 — https://github.com/adafruit/Adafruit_HMC5883_Unified
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `hmc5883_heading` : Cap magnétique (°)

## Points d'attention

- La plupart des modules GY-273 récents contiennent un QMC5883L (adresse 0x0D) : utilisez alors le module QMC5883L.

## Utilisation

1. Ouvrez `hmc5883l.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
