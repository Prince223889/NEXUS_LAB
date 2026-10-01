# HC-SR04P / RCWL-1601 (3,3 V)

Variante 3-5,5 V du HC-SR04 : compatible directement 3,3 V, sans pont diviseur.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 15 mA (pointe 15 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HC-SR04P / RCWL-1601 (3,3 V) | VCC | 3V3 |  |
| HC-SR04P / RCWL-1601 (3,3 V) | GND | GND |  |
| HC-SR04P / RCWL-1601 (3,3 V) | TRIG | GPIO4 |  |
| HC-SR04P / RCWL-1601 (3,3 V) | ECHO | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `hcsr04p_dist` : Distance (cm)

## Utilisation

1. Ouvrez `hcsr04p.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
