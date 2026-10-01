# Mini-pompe à eau 5 V (via MOSFET)

Pompe submersible pour l'arrosage automatique, avec durée maximale de sécurité.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 200 mA (pointe 400 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Mini-pompe à eau 5 V (via MOSFET) | VCC | 5V (VIN) |  |
| Mini-pompe à eau 5 V (via MOSFET) | GND | GND |  |
| Mini-pompe à eau 5 V (via MOSFET) | grille MOSFET / IN relais | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Ne faites jamais tourner la pompe à sec.
- Diode 1N4007 en parallèle de la pompe (cathode côté +).
- Consommation de pointe estimée 480 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Mini-pompe à eau 5 V (via MOSFET) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `pump.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
