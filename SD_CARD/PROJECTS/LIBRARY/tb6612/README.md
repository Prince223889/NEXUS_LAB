# Driver TB6612FNG (moteur CC)

Driver MOSFET efficace 1,2 A par voie, idéal pour petits robots.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 10 mA (pointe 1500 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Driver TB6612FNG (moteur CC) | VCC | 5V (VIN) |  |
| Driver TB6612FNG (moteur CC) | GND | GND |  |
| Driver TB6612FNG (moteur CC) | PWMA | GPIO4 |  |
| Driver TB6612FNG (moteur CC) | AIN1 | GPIO13 |  |
| Driver TB6612FNG (moteur CC) | AIN2 | GPIO14 |  |
| Driver TB6612FNG (moteur CC) | STBY | GPIO16 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Alimentez les moteurs séparément (piles/batterie), GND commun avec l'ESP32.
- Consommation de pointe estimée 1580 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Driver TB6612FNG (moteur CC) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `tb6612.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
