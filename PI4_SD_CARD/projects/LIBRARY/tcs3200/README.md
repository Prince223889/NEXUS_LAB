# TCS3200 / TCS230 (couleur)

Capteur de couleur à sortie en fréquence : filtres sélectionnés par S2/S3, échelle par S0/S1.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 3 mA (pointe 3 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| TCS3200 / TCS230 (couleur) | VCC | 3V3 |  |
| TCS3200 / TCS230 (couleur) | GND | GND |  |
| TCS3200 / TCS230 (couleur) | S0 | GPIO4 |  |
| TCS3200 / TCS230 (couleur) | S1 | GPIO13 |  |
| TCS3200 / TCS230 (couleur) | S2 | GPIO14 |  |
| TCS3200 / TCS230 (couleur) | S3 | GPIO16 |  |
| TCS3200 / TCS230 (couleur) | OUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tcs3200_red` : Rouge (Hz)
- `tcs3200_green` : Vert (Hz)
- `tcs3200_blue` : Bleu (Hz)

## Points d'attention

- Étalonnez avec une feuille blanche et une noire pour convertir les fréquences en RVB.

## Utilisation

1. Ouvrez `tcs3200.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
