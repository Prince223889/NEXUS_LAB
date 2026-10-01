# ML8511 (UV)

Capteur UV-A/B Lapis : intensité en mW/cm² de 0 à 15.

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| ML8511 (UV) | VCC | 3V3 |  |
| ML8511 (UV) | GND | GND |  |
| ML8511 (UV) | OUT | GPIO34 |  |
| ML8511 (UV) | EN | GPIO4 | ou relier EN à 3V3 |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ml8511_uv` : Intensité UV (mW/cm²)

## Utilisation

1. Ouvrez `ml8511.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
