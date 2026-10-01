# Débitmètre YF-S201

Débitmètre à effet Hall 1-30 L/min : 7,5 impulsions par L/min.

- **Catégorie** : Eau & aquariophilie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 15 mA (pointe 15 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Débitmètre YF-S201 | VCC | 5V (VIN) |  |
| Débitmètre YF-S201 | GND | GND |  |
| Débitmètre YF-S201 | signal (jaune) | GPIO4 | sortie collecteur ouvert : tirage interne activé |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `flow_lpm` : Débit (L/min)
- `flow_total` : Volume (L)

## Utilisation

1. Ouvrez `flow_yfs201.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
