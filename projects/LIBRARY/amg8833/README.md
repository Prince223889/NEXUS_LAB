# AMG8833 (caméra thermique 8×8)

Matrice de 64 thermopiles : image thermique 8×8 de 0 à 80 °C jusqu'à 7 m.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| AMG8833 (caméra thermique 8×8) | VCC | 3V3 |  |
| AMG8833 (caméra thermique 8×8) | GND | GND |  |
| AMG8833 (caméra thermique 8×8) | SDA | GPIO21 |  |
| AMG8833 (caméra thermique 8×8) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit AMG88xx Library** 1.3.2 — https://github.com/adafruit/Adafruit_AMG88xx
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `amg8833_tmax` : Max (°C)
- `amg8833_tmin` : Min (°C)
- `amg8833_tavg` : Moyenne (°C)
- `amg8833_chip` : Capteur (°C)

## Utilisation

1. Ouvrez `amg8833.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
