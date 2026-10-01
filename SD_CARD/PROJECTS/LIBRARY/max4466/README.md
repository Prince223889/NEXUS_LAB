# Microphone MAX4466 / MAX9814

Micro électret amplifié : niveau sonore crête-à-crête et estimation en dB relatifs.

- **Catégorie** : Santé, son & biométrie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Microphone MAX4466 / MAX9814 | VCC | 3V3 |  |
| Microphone MAX4466 / MAX9814 | GND | GND |  |
| Microphone MAX4466 / MAX9814 | OUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mic_pp` : Crête-à-crête (mV)
- `mic_db` : Niveau relatif (dB)

## Utilisation

1. Ouvrez `max4466.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
