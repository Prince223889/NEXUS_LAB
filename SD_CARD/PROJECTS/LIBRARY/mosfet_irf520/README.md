# Module MOSFET IRF520 / IRLZ44N

Commute une charge continue (ruban LED, moteur, électrovanne) jusqu'à 24 V en PWM.

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Module MOSFET IRF520 / IRLZ44N | VCC | 3V3 |  |
| Module MOSFET IRF520 / IRLZ44N | GND | GND |  |
| Module MOSFET IRF520 / IRLZ44N | SIG / Gate | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- L'IRF520 n'est pas « logic level » : en 3,3 V il conduit mal. Préférez un IRLZ44N ou un module à double MOSFET.
- Diode de roue libre obligatoire pour les charges inductives.

## Utilisation

1. Ouvrez `mosfet_irf520.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
