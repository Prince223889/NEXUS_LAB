# Gâche / serrure électrique 12 V

Serrure à solénoïde commandée par MOSFET : ouverture temporisée (3 s).

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 5 mA (pointe 600 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Gâche / serrure électrique 12 V | VCC | 5V (VIN) |  |
| Gâche / serrure électrique 12 V | GND | GND |  |
| Gâche / serrure électrique 12 V | grille MOSFET | GPIO4 |  |
| Gâche / serrure électrique 12 V | +12 V serrure | alimentation 12 V externe | diode de roue libre en parallèle |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Consommation de pointe estimée 680 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Gâche / serrure électrique 12 V directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `solenoid_lock.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
