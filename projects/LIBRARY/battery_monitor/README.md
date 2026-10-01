# Niveau de batterie Li-ion (pont 100k/100k)

Tension et pourcentage estimé d'une cellule 18650 (3,0-4,2 V) via un pont diviseur par 2.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Niveau de batterie Li-ion (pont 100k/100k) | VCC | 3V3 |  |
| Niveau de batterie Li-ion (pont 100k/100k) | GND | GND |  |
| Niveau de batterie Li-ion (pont 100k/100k) | point milieu | GPIO34 | 100 kΩ vers la batterie +, 100 kΩ vers GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `batt_volt` : Tension (V)
- `batt_pct` : Charge estimée (%)

## Utilisation

1. Ouvrez `battery_monitor.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
