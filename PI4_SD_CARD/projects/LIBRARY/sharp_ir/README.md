# Sharp GP2Y0A21YK0F (IR 10-80 cm)

Télémètre infrarouge analogique par triangulation, sortie non linéaire 0,4-3,1 V.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Sharp GP2Y0A21YK0F (IR 10-80 cm) | VCC | 5V (VIN) |  |
| Sharp GP2Y0A21YK0F (IR 10-80 cm) | GND | GND |  |
| Sharp GP2Y0A21YK0F (IR 10-80 cm) | Vo (jaune) | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sharp_dist` : Distance (cm)

## Points d'attention

- Ajoutez un condensateur 10 µF sur l'alimentation du capteur (pics de courant).

## Utilisation

1. Ouvrez `sharp_ir.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
