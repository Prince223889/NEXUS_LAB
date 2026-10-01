# Matrice LED 8×8 MAX7219

Matrice de 64 LED : barregraphe de la première mesure ou animation.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 80 mA (pointe 320 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Matrice LED 8×8 MAX7219 | VCC | 5V (VIN) |  |
| Matrice LED 8×8 MAX7219 | GND | GND |  |
| Matrice LED 8×8 MAX7219 | DIN | GPIO4 |  |
| Matrice LED 8×8 MAX7219 | CS | GPIO13 |  |
| Matrice LED 8×8 MAX7219 | CLK | GPIO14 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Alimentez Matrice LED 8×8 MAX7219 directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `max7219_matrix.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
