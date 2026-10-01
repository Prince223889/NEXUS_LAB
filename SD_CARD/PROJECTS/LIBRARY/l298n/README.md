# Pont en H L298N (moteur CC)

Double pont en H 2 A : sens et vitesse de deux moteurs à courant continu.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 10 mA (pointe 1500 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Pont en H L298N (moteur CC) | VCC | 5V (VIN) |  |
| Pont en H L298N (moteur CC) | GND | GND |  |
| Pont en H L298N (moteur CC) | ENA (retirer le cavalier) | GPIO4 |  |
| Pont en H L298N (moteur CC) | IN1 | GPIO13 |  |
| Pont en H L298N (moteur CC) | IN2 | GPIO14 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Le L298N perd ~2 V : alimentez-le en 7-12 V pour des moteurs 6 V.
- GND commun avec l'ESP32.
- Consommation de pointe estimée 1580 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Pont en H L298N (moteur CC) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `l298n.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
