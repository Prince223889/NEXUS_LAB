# Sonde TDS (conductivité)

Total des solides dissous en ppm (qualité de l'eau potable, hydroponie).

- **Catégorie** : Eau & aquariophilie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Sonde TDS (conductivité) | VCC | 3V3 |  |
| Sonde TDS (conductivité) | GND | GND |  |
| Sonde TDS (conductivité) | A | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tds_tds` : TDS (ppm)

## Points d'attention

- Eau potable : < 300 ppm excellent, > 1000 ppm déconseillé.

## Utilisation

1. Ouvrez `tds.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
