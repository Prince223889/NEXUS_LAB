# APDS9960 (gestes, proximité, couleur)

Détecte les gestes haut/bas/gauche/droite, la proximité et la couleur ambiante.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| APDS9960 (gestes, proximité, couleur) | VCC | 3V3 |  |
| APDS9960 (gestes, proximité, couleur) | GND | GND |  |
| APDS9960 (gestes, proximité, couleur) | SDA | GPIO21 |  |
| APDS9960 (gestes, proximité, couleur) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit APDS9960 Library** 1.3.1 — https://github.com/adafruit/Adafruit_APDS9960
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `apds9960_prox` : Proximité (0-255)
- `apds9960_gesture` : Dernier geste (1-4)

## Points d'attention

- Le mode gestes nécessite une lecture rapide : laissez la période à 50 ms.

## Utilisation

1. Ouvrez `apds9960.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
