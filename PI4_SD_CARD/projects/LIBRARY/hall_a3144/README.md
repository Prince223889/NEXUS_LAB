# Capteur à effet Hall A3144 (KY-003)

Interrupteur magnétique : détecte le pôle sud d'un aimant (compte-tours, fin de course).

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur à effet Hall A3144 (KY-003) | VCC | 3V3 |  |
| Capteur à effet Hall A3144 (KY-003) | GND | GND |  |
| Capteur à effet Hall A3144 (KY-003) | S (collecteur ouvert) | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `hall_magnet` : Aimant (0/1)
- `hall_pulses` : Impulsions

## Utilisation

1. Ouvrez `hall_a3144.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
