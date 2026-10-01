# Émetteur infrarouge (LED IR 940 nm)

Envoie des codes de télécommande NEC : pilotez une TV, une climatisation ou un ventilateur.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Émetteur infrarouge (LED IR 940 nm) | VCC | 3V3 |  |
| Émetteur infrarouge (LED IR 940 nm) | GND | GND |  |
| Émetteur infrarouge (LED IR 940 nm) | LED IR (via transistor) | GPIO4 | LED IR + 100 Ω, idéalement commutée par un transistor NPN |

## Bibliothèques

- **IRremote** 4.7.1 — https://github.com/Arduino-IRremote/Arduino-IRremote

## Utilisation

1. Ouvrez `ir_transmitter.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
