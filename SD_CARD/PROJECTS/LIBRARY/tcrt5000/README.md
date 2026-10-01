# Suiveur de ligne TCRT5000

Capteur réflectif pour robot suiveur de ligne : distingue une ligne noire d'un sol clair.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Suiveur de ligne TCRT5000 | VCC | 3V3 |  |
| Suiveur de ligne TCRT5000 | GND | GND |  |
| Suiveur de ligne TCRT5000 | D0 | GPIO35 |  |
| Suiveur de ligne TCRT5000 | A0 | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `line_black` : Ligne noire (0/1)
- `line_refl` : Réflexion (%)

## Utilisation

1. Ouvrez `tcrt5000.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
