# LED à intensité variable (PWM)

Variation progressive de luminosité par modulation de largeur d'impulsion (LEDC 5 kHz, 10 bits).

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 10 mA (pointe 10 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LED à intensité variable (PWM) | VCC | 3V3 |  |
| LED à intensité variable (PWM) | GND | GND |  |
| LED à intensité variable (PWM) | anode via 220 Ω | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `led_pwm.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
