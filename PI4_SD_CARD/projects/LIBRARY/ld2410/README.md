# HLK-LD2410 (radar mmWave présence humaine)

Radar 24 GHz qui détecte une personne immobile (respiration) jusqu'à 6 m.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 80 mA (pointe 80 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HLK-LD2410 (radar mmWave présence humaine) | VCC | 5V (VIN) |  |
| HLK-LD2410 (radar mmWave présence humaine) | GND | GND |  |
| HLK-LD2410 (radar mmWave présence humaine) | OUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ld2410_motion` : Présence (0/1)

## Points d'attention

- Sortie OUT = présence ; la liaison série (256000 bauds) donne distance et énergie.

## Utilisation

1. Ouvrez `ld2410.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
