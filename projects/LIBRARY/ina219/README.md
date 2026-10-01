# INA219 (tension/courant/puissance)

Wattmètre continu jusqu'à 26 V / 3,2 A : consommation d'un montage, suivi de batterie.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| INA219 (tension/courant/puissance) | VCC | 3V3 |  |
| INA219 (tension/courant/puissance) | GND | GND |  |
| INA219 (tension/courant/puissance) | SDA | GPIO21 |  |
| INA219 (tension/courant/puissance) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit INA219** 1.1.0 — https://github.com/adafruit/Adafruit_INA219
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ina219_volt` : Tension (V)
- `ina219_curr` : Courant (mA)
- `ina219_power` : Puissance (mW)

## Points d'attention

- Le shunt se place en série sur le + de la charge (VIN+ côté source, VIN- côté charge).

## Utilisation

1. Ouvrez `ina219.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
