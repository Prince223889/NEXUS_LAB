# INA260 (shunt intégré 15 A)

Wattmètre avec shunt de précision intégré : 36 V et ±15 A sans calcul d'étalonnage.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| INA260 (shunt intégré 15 A) | VCC | 3V3 |  |
| INA260 (shunt intégré 15 A) | GND | GND |  |
| INA260 (shunt intégré 15 A) | SDA | GPIO21 |  |
| INA260 (shunt intégré 15 A) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit INA260 Library** 1.5.3 — https://github.com/adafruit/Adafruit_INA260
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ina260_volt` : Tension (V)
- `ina260_curr` : Courant (mA)
- `ina260_power` : Puissance (mW)

## Utilisation

1. Ouvrez `ina260.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
