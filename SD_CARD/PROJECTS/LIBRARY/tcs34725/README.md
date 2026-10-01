# TCS34725 (couleur RVB)

Capteur de couleur avec filtre IR et LED blanche : composantes R, V, B, température de couleur et lux.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 20 mA (pointe 20 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| TCS34725 (couleur RVB) | VCC | 3V3 |  |
| TCS34725 (couleur RVB) | GND | GND |  |
| TCS34725 (couleur RVB) | SDA | GPIO21 |  |
| TCS34725 (couleur RVB) | SCL | GPIO22 |  |
| TCS34725 (couleur RVB) | LED | GPIO4 | LED blanche du module (HIGH = allumée) |

## Bibliothèques

- **Adafruit TCS34725** 1.4.0 — https://github.com/adafruit/Adafruit_TCS34725

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tcs34725_red` : Rouge (0-255)
- `tcs34725_green` : Vert (0-255)
- `tcs34725_blue` : Bleu (0-255)
- `tcs34725_cct` : Température de couleur (K)
- `tcs34725_lux` : Éclairement (lx)

## Utilisation

1. Ouvrez `tcs34725.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
