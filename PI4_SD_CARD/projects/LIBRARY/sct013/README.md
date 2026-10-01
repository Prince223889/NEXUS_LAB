# Pince ampèremétrique SCT-013-030

Mesure non invasive du courant alternatif (30 A → 1 V) autour d'un seul conducteur.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Pince ampèremétrique SCT-013-030 | VCC | 3V3 |  |
| Pince ampèremétrique SCT-013-030 | GND | GND |  |
| Pince ampèremétrique SCT-013-030 | jack (pointe) | GPIO34 | pont 10 kΩ/10 kΩ + condensateur 10 µF pour centrer à 1,65 V |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sct013_irms` : Courant efficace (A)
- `sct013_watts` : Puissance apparente (W)

## Points d'attention

- La pince entoure UN seul fil (phase OU neutre), jamais le câble entier.

## Utilisation

1. Ouvrez `sct013.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
