# Convertisseur N/A interne (DAC 8 bits)

Sortie de tension analogique vraie (0-3,3 V, 8 bits) sur GPIO25/26 : générateur de signal.

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Convertisseur N/A interne (DAC 8 bits) | VCC | 3V3 |  |
| Convertisseur N/A interne (DAC 8 bits) | GND | GND |  |
| Convertisseur N/A interne (DAC 8 bits) | sortie DAC | GPIO25 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `dac_internal.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
