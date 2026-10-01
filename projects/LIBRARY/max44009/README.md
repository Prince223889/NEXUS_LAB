# MAX44009 (GY-49)

Luxmètre ultra-basse consommation 0,045-188 000 lx (lecture directe des registres).

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MAX44009 (GY-49) | VCC | 3V3 |  |
| MAX44009 (GY-49) | GND | GND |  |
| MAX44009 (GY-49) | SDA | GPIO21 |  |
| MAX44009 (GY-49) | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `max44009_lux` : Éclairement (lx)

## Utilisation

1. Ouvrez `max44009.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
