# AS7341 (spectromètre 11 canaux)

Mini-spectromètre : 8 bandes visibles de 415 à 680 nm, proche IR et lumière claire.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| AS7341 (spectromètre 11 canaux) | VCC | 3V3 |  |
| AS7341 (spectromètre 11 canaux) | GND | GND |  |
| AS7341 (spectromètre 11 canaux) | SDA | GPIO21 |  |
| AS7341 (spectromètre 11 canaux) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit AS7341** 1.4.1 — https://github.com/adafruit/Adafruit_AS7341
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `as7341_f415` : 415 nm (violet)
- `as7341_f480` : 480 nm (bleu)
- `as7341_f555` : 555 nm (vert)
- `as7341_f630` : 630 nm (orange)
- `as7341_f680` : 680 nm (rouge)
- `as7341_nir` : Proche IR

## Utilisation

1. Ouvrez `as7341.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
