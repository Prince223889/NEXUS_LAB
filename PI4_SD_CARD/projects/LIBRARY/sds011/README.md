# SDS011 (particules fines)

Capteur laser Nova Fitness : PM2.5 et PM10, utilisé par le réseau citoyen Sensor.Community.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 70 mA (pointe 70 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SDS011 (particules fines) | VCC | 5V (VIN) |  |
| SDS011 (particules fines) | GND | GND |  |
| SDS011 (particules fines) | TXD du capteur | GPIO16 |  |
| SDS011 (particules fines) | RXD du capteur | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sds011_pm25` : PM2.5 (µg/m³)
- `sds011_pm10` : PM10 (µg/m³)

## Utilisation

1. Ouvrez `sds011.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
