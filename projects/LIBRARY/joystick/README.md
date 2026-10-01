# Joystick analogique KY-023

Deux axes analogiques et un bouton poussoir (clic central).

- **Catégorie** : Boutons, claviers & commandes
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Joystick analogique KY-023 | VCC | 3V3 |  |
| Joystick analogique KY-023 | GND | GND |  |
| Joystick analogique KY-023 | VRx | GPIO34 |  |
| Joystick analogique KY-023 | VRy | GPIO35 |  |
| Joystick analogique KY-023 | SW | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `joy_x` : Axe X (%)
- `joy_y` : Axe Y (%)
- `joy_click` : Clic

## Points d'attention

- Alimentez le joystick en 3V3 (pas en 5 V) pour rester dans la plage de l'ADC.

## Utilisation

1. Ouvrez `joystick.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
