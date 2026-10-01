# ENS160 (AQI / eCO₂ / COVT)

Capteur ScioSense : indice de qualité de l'air UBA (1-5), COVT et eCO₂. Souvent vendu avec l'AHT21.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| ENS160 (AQI / eCO₂ / COVT) | VCC | 3V3 |  |
| ENS160 (AQI / eCO₂ / COVT) | GND | GND |  |
| ENS160 (AQI / eCO₂ / COVT) | SDA | GPIO21 |  |
| ENS160 (AQI / eCO₂ / COVT) | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ens160_aqi` : Indice AQI (1-5)
- `ens160_tvoc` : COVT (ppb)
- `ens160_eco2` : eCO₂ (ppm)

## Points d'attention

- Premières valeurs fiables après ~3 min (1 h lors de la toute première utilisation).

## Utilisation

1. Ouvrez `ens160.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
