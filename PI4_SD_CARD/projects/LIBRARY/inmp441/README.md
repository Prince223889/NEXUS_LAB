# INMP441 (micro numérique I2S)

Microphone MEMS numérique 24 bits : niveau sonore RMS, base pour reconnaissance audio.

- **Catégorie** : Santé, son & biométrie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 1.5 mA (pointe 1.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| INMP441 (micro numérique I2S) | VCC | 3V3 |  |
| INMP441 (micro numérique I2S) | GND | GND |  |
| INMP441 (micro numérique I2S) | SCK | GPIO4 |  |
| INMP441 (micro numérique I2S) | WS | GPIO13 |  |
| INMP441 (micro numérique I2S) | SD | GPIO34 |  |
| INMP441 (micro numérique I2S) | L/R | GND | canal gauche |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `inmp441_dbfs` : Niveau RMS (dBFS)

## Utilisation

1. Ouvrez `inmp441.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
