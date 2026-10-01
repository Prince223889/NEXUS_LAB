# Pas-à-pas NEMA 17 + A4988 / DRV8825

Moteur 200 pas/tour avec driver STEP/DIR : imprimante 3D, CNC, axe linéaire.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | VCC | 5V (VIN) |  |
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | GND | GND |  |
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | STEP | GPIO4 |  |
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | DIR | GPIO13 |  |
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | EN (actif bas) | GPIO14 |  |
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | VMOT | alimentation 12 V + condensateur 100 µF | réglez le courant (potentiomètre Vref) |
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | RESET + SLEEP | reliées entre elles |  |

## Bibliothèques

- **AccelStepper** 1.64 — https://github.com/waspinator/AccelStepper

## Points d'attention

- Ne jamais débrancher le moteur quand le driver est alimenté (destruction du A4988).

## Utilisation

1. Ouvrez `stepper_a4988.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
