# Capteur de pouls (Pulse Sensor)

Capteur optique au bout du doigt : détection des battements et fréquence cardiaque (BPM).

- **Catégorie** : Santé, son & biométrie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 4 mA (pointe 4 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur de pouls (Pulse Sensor) | VCC | 3V3 |  |
| Capteur de pouls (Pulse Sensor) | GND | GND |  |
| Capteur de pouls (Pulse Sensor) | S (violet) | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pulse_signal` : Signal (mV)
- `pulse_bpm` : Fréquence cardiaque (BPM)

## Points d'attention

- Réglez le seuil `th` selon l'amplitude de votre signal (traceur série).
- Usage pédagogique uniquement, pas de diagnostic médical.

## Utilisation

1. Ouvrez `pulse_sensor.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
