# Radio série HC-12 (433 MHz, 1 km)

Module radio transparent : tout ce qui est écrit sur la liaison série est reçu par l'autre HC-12.

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 16 mA (pointe 100 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Radio série HC-12 (433 MHz, 1 km) | VCC | 3V3 |  |
| Radio série HC-12 (433 MHz, 1 km) | GND | GND |  |
| Radio série HC-12 (433 MHz, 1 km) | TXD du HC-12 | GPIO16 |  |
| Radio série HC-12 (433 MHz, 1 km) | RXD du HC-12 | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `hc12.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
