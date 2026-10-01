# LED RVB (cathode commune)

LED tricolore pilotée en PWM : toutes les couleurs par mélange rouge/vert/bleu.

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 40 mA (pointe 40 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LED RVB (cathode commune) | VCC | 3V3 |  |
| LED RVB (cathode commune) | GND | GND |  |
| LED RVB (cathode commune) | rouge via 220 Ω | GPIO4 |  |
| LED RVB (cathode commune) | vert via 220 Ω | GPIO13 |  |
| LED RVB (cathode commune) | bleu via 220 Ω | GPIO14 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `rgb_led.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
