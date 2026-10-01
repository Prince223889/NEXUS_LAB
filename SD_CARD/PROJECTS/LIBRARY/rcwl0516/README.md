# RCWL-0516 (radar micro-ondes)

Radar Doppler 3,2 GHz : détecte les mouvements à 7 m, même à travers une paroi fine.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 3 mA (pointe 3 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| RCWL-0516 (radar micro-ondes) | VCC | 5V (VIN) |  |
| RCWL-0516 (radar micro-ondes) | GND | GND |  |
| RCWL-0516 (radar micro-ondes) | OUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rcwl0516_motion` : Présence (0/1)

## Points d'attention

- Traverse le plastique et le bois : ne le placez pas derrière du métal.

## Utilisation

1. Ouvrez `rcwl0516.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
