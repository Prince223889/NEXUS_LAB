# CCS811 (eCO₂ / COVT)

Capteur MOX : COV totaux (0-1187 ppb) et CO₂ équivalent (400-8192 ppm).

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| CCS811 (eCO₂ / COVT) | VCC | 3V3 |  |
| CCS811 (eCO₂ / COVT) | GND | GND |  |
| CCS811 (eCO₂ / COVT) | SDA | GPIO21 |  |
| CCS811 (eCO₂ / COVT) | SCL | GPIO22 |  |
| CCS811 (eCO₂ / COVT) | WAK | GPIO4 | relier à GND si non utilisé |

## Bibliothèques

- **Adafruit CCS811 Library** 1.1.3 — https://github.com/adafruit/Adafruit_CCS811
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ccs811_eco2` : eCO₂ (ppm)
- `ccs811_tvoc` : COVT (ppb)

## Points d'attention

- Rodage de 48 h conseillé puis 20 min de chauffe à chaque démarrage.

## Utilisation

1. Ouvrez `ccs811.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
