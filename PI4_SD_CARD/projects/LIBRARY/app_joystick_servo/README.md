# Tourelle pan-tilt au joystick

Deux servos (panoramique et inclinaison) suivent les axes d'un joystick.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 21 mA (pointe 1301 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Joystick analogique KY-023 | VCC | 3V3 |  |
| Joystick analogique KY-023 | GND | GND |  |
| Joystick analogique KY-023 | VRx | GPIO34 |  |
| Joystick analogique KY-023 | VRy | GPIO35 |  |
| Joystick analogique KY-023 | SW | GPIO4 |  |
| Servomoteur SG90 / MG90S | VCC | 5V (VIN) |  |
| Servomoteur SG90 / MG90S | GND | GND |  |
| Servomoteur SG90 / MG90S | signal (orange) | GPIO13 |  |
| Servomoteur SG90 / MG90S | VCC | 5V (VIN) |  |
| Servomoteur SG90 / MG90S | GND | GND |  |
| Servomoteur SG90 / MG90S | signal (orange) | GPIO14 |  |

## Bibliothèques

- **ESP32Servo** 3.2.1 — https://github.com/madhephaestus/ESP32Servo

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `joy_x` : Axe X (%)
- `joy_y` : Axe Y (%)
- `joy_click` : Clic

## Points d'attention

- Consommation de pointe estimée 1381 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Servomoteur SG90 / MG90S, Servomoteur SG90 / MG90S directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `app_joystick_servo.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
