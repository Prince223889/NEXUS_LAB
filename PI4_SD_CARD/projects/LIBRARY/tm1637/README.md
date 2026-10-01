# Afficheur 4 chiffres TM1637

Afficheur 7 segments 4 chiffres avec deux-points : montre la première mesure du projet (ou un compteur).

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 20 mA (pointe 20 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Afficheur 4 chiffres TM1637 | VCC | 3V3 |  |
| Afficheur 4 chiffres TM1637 | GND | GND |  |
| Afficheur 4 chiffres TM1637 | CLK | GPIO4 |  |
| Afficheur 4 chiffres TM1637 | DIO | GPIO13 |  |

## Bibliothèques

- **TM1637** 1.2.0 — https://github.com/avishorp/TM1637

## Utilisation

1. Ouvrez `tm1637.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
