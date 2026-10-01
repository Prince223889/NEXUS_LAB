# Capteur de pluie FC-37 / YL-83

Plaque de détection de gouttes avec comparateur LM393 : intensité (AO) et seuil (DO).

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur de pluie FC-37 / YL-83 | VCC | 3V3 |  |
| Capteur de pluie FC-37 / YL-83 | GND | GND |  |
| Capteur de pluie FC-37 / YL-83 | AO | GPIO34 |  |
| Capteur de pluie FC-37 / YL-83 | DO | GPIO35 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rain_wet` : Humidité plaque (%)
- `rain_rain` : Pluie (0/1)

## Points d'attention

- Pour éviter l'électrolyse, alimentez la plaque via une broche GPIO uniquement pendant la mesure.

## Utilisation

1. Ouvrez `rain.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
