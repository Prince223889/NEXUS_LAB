# MH-Z19B / MH-Z19C (CO₂ NDIR)

Capteur CO₂ infrarouge Winsen 0-5000 ppm, liaison série 9600 bauds.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 20 mA (pointe 150 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MH-Z19B / MH-Z19C (CO₂ NDIR) | VCC | 5V (VIN) |  |
| MH-Z19B / MH-Z19C (CO₂ NDIR) | GND | GND |  |
| MH-Z19B / MH-Z19C (CO₂ NDIR) | TX du capteur | GPIO16 | TX du MH-Z19 → RX de l'ESP32 |
| MH-Z19B / MH-Z19C (CO₂ NDIR) | RX du capteur | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mhz19_co2` : CO₂ (ppm)
- `mhz19_temp` : Température interne (°C)

## Points d'attention

- Préchauffage de 3 min.
- Alimentation 5 V, niveaux série 3,3 V compatibles.

## Utilisation

1. Ouvrez `mhz19.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
