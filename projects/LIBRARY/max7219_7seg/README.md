# Afficheur 8 chiffres MAX7219

Barrette 8 chiffres 7 segments : affiche la première mesure avec une décimale.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 60 mA (pointe 60 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Afficheur 8 chiffres MAX7219 | VCC | 5V (VIN) |  |
| Afficheur 8 chiffres MAX7219 | GND | GND |  |
| Afficheur 8 chiffres MAX7219 | DIN | GPIO4 |  |
| Afficheur 8 chiffres MAX7219 | CS | GPIO13 |  |
| Afficheur 8 chiffres MAX7219 | CLK | GPIO14 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `max7219_7seg.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
