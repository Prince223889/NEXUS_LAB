# Capteur de niveau d'eau (pistes)

Plaque à pistes parallèles : tension proportionnelle à la hauteur d'eau (0-4 cm).

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur de niveau d'eau (pistes) | VCC | 3V3 |  |
| Capteur de niveau d'eau (pistes) | GND | GND |  |
| Capteur de niveau d'eau (pistes) | S | GPIO34 |  |
| Capteur de niveau d'eau (pistes) | + (via GPIO) | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `wlevel_level` : Niveau (%)
- `wlevel_mv` : Tension (mV)

## Utilisation

1. Ouvrez `water_level.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
