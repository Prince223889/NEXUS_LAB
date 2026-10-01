# Variateur de LED au potentiomètre

La luminosité de la LED suit le potentiomètre (PWM avec correction de perception).

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 11 mA (pointe 11 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Potentiomètre 10 kΩ | VCC | 3V3 |  |
| Potentiomètre 10 kΩ | GND | GND |  |
| Potentiomètre 10 kΩ | curseur (broche du milieu) | GPIO34 | extrémités sur 3V3 et GND |
| LED à intensité variable (PWM) | VCC | 3V3 |  |
| LED à intensité variable (PWM) | GND | GND |  |
| LED à intensité variable (PWM) | anode via 220 Ω | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pot_pos` : Position (%)

## Utilisation

1. Ouvrez `app_variateur_potentiometre.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
