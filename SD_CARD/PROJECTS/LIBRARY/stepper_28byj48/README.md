# Moteur pas-à-pas 28BYJ-48 + ULN2003

Petit moteur pas-à-pas réducté (4096 demi-pas par tour) : aiguille, store, distributeur.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 240 mA (pointe 240 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | VCC | 5V (VIN) |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | GND | GND |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN1 | GPIO4 |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN2 | GPIO13 |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN3 | GPIO14 |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN4 | GPIO16 |  |

## Bibliothèques

- **AccelStepper** 1.64 — https://github.com/waspinator/AccelStepper

## Points d'attention

- Alimentez Moteur pas-à-pas 28BYJ-48 + ULN2003 directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `stepper_28byj48.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
