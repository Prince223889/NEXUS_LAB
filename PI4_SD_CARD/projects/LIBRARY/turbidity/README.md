# Capteur de turbidité

Mesure la clarté de l'eau (NTU) par diffusion infrarouge.

- **Catégorie** : Eau & aquariophilie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 40 mA (pointe 40 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur de turbidité | VCC | 5V (VIN) |  |
| Capteur de turbidité | GND | GND |  |
| Capteur de turbidité | OUT (A) | GPIO34 | via pont diviseur 10 kΩ / 20 kΩ (sortie 0-4,5 V) |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `turb_ntu` : Turbidité (NTU)
- `turb_volt` : Tension (V)

## Utilisation

1. Ouvrez `turbidity.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
