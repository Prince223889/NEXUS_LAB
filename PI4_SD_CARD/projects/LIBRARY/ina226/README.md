# INA226 (wattmètre 36 V)

Wattmètre haute précision jusqu'à 36 V ; shunt de 0,1 Ω sur les modules courants.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| INA226 (wattmètre 36 V) | VCC | 3V3 |  |
| INA226 (wattmètre 36 V) | GND | GND |  |
| INA226 (wattmètre 36 V) | SDA | GPIO21 |  |
| INA226 (wattmètre 36 V) | SCL | GPIO22 |  |

## Bibliothèques

- **INA226** 0.6.6 — https://github.com/RobTillaart/INA226

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ina226_volt` : Tension (V)
- `ina226_curr` : Courant (mA)
- `ina226_power` : Puissance (mW)

## Utilisation

1. Ouvrez `ina226.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
