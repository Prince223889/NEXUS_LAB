# Moteur vibreur (via transistor)

Petit moteur à masselotte : retour haptique, alerte silencieuse.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 80 mA (pointe 80 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Moteur vibreur (via transistor) | VCC | 3V3 |  |
| Moteur vibreur (via transistor) | GND | GND |  |
| Moteur vibreur (via transistor) | SIG / Gate | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `vibration_motor.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
