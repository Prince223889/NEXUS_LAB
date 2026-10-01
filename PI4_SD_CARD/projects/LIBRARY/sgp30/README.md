# SGP30 (eCO₂ / COVT)

Capteur multi-pixels Sensirion : COV totaux et CO₂ équivalent, mesure chaque seconde.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 48 mA (pointe 48 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SGP30 (eCO₂ / COVT) | VCC | 3V3 |  |
| SGP30 (eCO₂ / COVT) | GND | GND |  |
| SGP30 (eCO₂ / COVT) | SDA | GPIO21 |  |
| SGP30 (eCO₂ / COVT) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SGP30 Sensor** 2.0.3 — https://github.com/adafruit/Adafruit_SGP30
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sgp30_eco2` : eCO₂ (ppm)
- `sgp30_tvoc` : COVT (ppb)

## Points d'attention

- L'algorithme nécessite une mesure par seconde : gardez la période à 1000 ms.

## Utilisation

1. Ouvrez `sgp30.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
