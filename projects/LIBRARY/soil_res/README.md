# Humidité du sol résistive YL-69 / FC-28

Fourche résistive économique ; alimentée seulement pendant la mesure pour limiter la corrosion.

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Humidité du sol résistive YL-69 / FC-28 | VCC | 3V3 |  |
| Humidité du sol résistive YL-69 / FC-28 | GND | GND |  |
| Humidité du sol résistive YL-69 / FC-28 | AO | GPIO34 |  |
| Humidité du sol résistive YL-69 / FC-28 | VCC (via GPIO) | GPIO4 | la sonde est alimentée par cette broche |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `soilr_moist` : Humidité du sol (%)

## Utilisation

1. Ouvrez `soil_res.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
