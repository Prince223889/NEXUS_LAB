# Driver L9110S (moteur CC)

Petit double pont en H 800 mA très économique.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 10 mA (pointe 1500 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Driver L9110S (moteur CC) | VCC | 5V (VIN) |  |
| Driver L9110S (moteur CC) | GND | GND |  |
| Driver L9110S (moteur CC) | A-IA | GPIO4 |  |
| Driver L9110S (moteur CC) | A-IB | GPIO13 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Alimentez les moteurs séparément (piles/batterie), GND commun avec l'ESP32.
- Consommation de pointe estimée 1580 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Driver L9110S (moteur CC) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `l9110s.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
