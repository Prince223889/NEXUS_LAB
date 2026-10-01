# TSL2591

Luxmètre à très haute dynamique (188 µlx à 88 000 lx), mesure de nuit comme en plein soleil.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| TSL2591 | VCC | 3V3 |  |
| TSL2591 | GND | GND |  |
| TSL2591 | SDA | GPIO21 |  |
| TSL2591 | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit TSL2591 Library** 1.4.5 — https://github.com/adafruit/Adafruit_TSL2591_Library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tsl2591_lux` : Éclairement (lx)
- `tsl2591_ir` : Infrarouge brut

## Utilisation

1. Ouvrez `tsl2591.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
