# Capteur de son KY-038 / LM393

Micro électret + comparateur : détection de bruit / claquement de mains (seuil réglable).

- **Catégorie** : Santé, son & biométrie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur de son KY-038 / LM393 | VCC | 3V3 |  |
| Capteur de son KY-038 / LM393 | GND | GND |  |
| Capteur de son KY-038 / LM393 | DO | GPIO35 |  |
| Capteur de son KY-038 / LM393 | AO | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sound_loud` : Bruit (0/1)
- `sound_count` : Détections
- `sound_level` : Niveau (mV)

## Utilisation

1. Ouvrez `sound_ky038.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
