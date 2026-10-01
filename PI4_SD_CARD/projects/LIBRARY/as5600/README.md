# AS5600 (codeur magnétique 12 bits)

Mesure l'angle absolu d'un aimant diamétral (0-360°, 4096 pas) sans contact.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| AS5600 (codeur magnétique 12 bits) | VCC | 3V3 |  |
| AS5600 (codeur magnétique 12 bits) | GND | GND |  |
| AS5600 (codeur magnétique 12 bits) | SDA | GPIO21 |  |
| AS5600 (codeur magnétique 12 bits) | SCL | GPIO22 |  |

## Bibliothèques

- **AS5600** 0.6.7 — https://github.com/RobTillaart/AS5600

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `as5600_angle` : Angle (°)
- `as5600_magnet` : Aimant détecté

## Utilisation

1. Ouvrez `as5600.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
