# TSL2561

Luxmètre à deux photodiodes (visible + IR) : 0,1-40 000 lx, proche de la vision humaine.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| TSL2561 | VCC | 3V3 |  |
| TSL2561 | GND | GND |  |
| TSL2561 | SDA | GPIO21 |  |
| TSL2561 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit TSL2561** 1.1.3 — https://github.com/adafruit/Adafruit_TSL2561
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tsl2561_lux` : Éclairement (lx)
- `tsl2561_ir` : Infrarouge brut

## Utilisation

1. Ouvrez `tsl2561.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
