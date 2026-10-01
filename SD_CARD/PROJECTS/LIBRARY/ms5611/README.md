# MS5611 (GY-63)

Baromètre 24 bits pour variomètres et drones (résolution 10 cm).

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MS5611 (GY-63) | VCC | 3V3 |  |
| MS5611 (GY-63) | GND | GND |  |
| MS5611 (GY-63) | SDA | GPIO21 |  |
| MS5611 (GY-63) | SCL | GPIO22 |  |

## Bibliothèques

- **MS5611** 0.5.2 — https://github.com/RobTillaart/MS5611

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ms5611_temp` : Température (°C)
- `ms5611_press` : Pression (hPa)

## Utilisation

1. Ouvrez `ms5611.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
