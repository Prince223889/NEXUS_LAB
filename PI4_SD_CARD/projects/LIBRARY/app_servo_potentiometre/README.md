# Servomoteur piloté par potentiomètre

Le grand classique : l'angle du servo suit la position du potentiomètre.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 11 mA (pointe 651 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Potentiomètre 10 kΩ | VCC | 3V3 |  |
| Potentiomètre 10 kΩ | GND | GND |  |
| Potentiomètre 10 kΩ | curseur (broche du milieu) | GPIO34 | extrémités sur 3V3 et GND |
| Servomoteur SG90 / MG90S | VCC | 5V (VIN) |  |
| Servomoteur SG90 / MG90S | GND | GND |  |
| Servomoteur SG90 / MG90S | signal (orange) | GPIO4 |  |

## Bibliothèques

- **ESP32Servo** 3.2.1 — https://github.com/madhephaestus/ESP32Servo

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pot_pos` : Position (%)

## Points d'attention

- Consommation de pointe estimée 731 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Servomoteur SG90 / MG90S directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `app_servo_potentiometre.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
