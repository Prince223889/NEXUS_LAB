# Driver BTS7960 43 A (moteur puissant)

Pont en H de puissance pour trottinette, portail, grosse pompe.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 10 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Driver BTS7960 43 A (moteur puissant) | VCC | 5V (VIN) |  |
| Driver BTS7960 43 A (moteur puissant) | GND | GND |  |
| Driver BTS7960 43 A (moteur puissant) | RPWM | GPIO4 |  |
| Driver BTS7960 43 A (moteur puissant) | LPWM | GPIO13 |  |
| Driver BTS7960 43 A (moteur puissant) | R_EN + L_EN | GPIO14 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Fusible et câblage de section adaptée côté puissance.

## Utilisation

1. Ouvrez `bts7960.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
