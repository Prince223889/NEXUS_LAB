# GPS u-blox NEO-6M / NEO-M8N

Position, altitude, vitesse, heure UTC et nombre de satellites (trames NMEA 9600 bauds).

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 45 mA (pointe 45 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| GPS u-blox NEO-6M / NEO-M8N | VCC | 3V3 |  |
| GPS u-blox NEO-6M / NEO-M8N | GND | GND |  |
| GPS u-blox NEO-6M / NEO-M8N | TX du GPS | GPIO16 |  |
| GPS u-blox NEO-6M / NEO-M8N | RX du GPS | GPIO17 |  |

## Bibliothèques

- **TinyGPSPlus** 1.0.3 — https://github.com/mikalhart/TinyGPSPlus

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `gps_lat` : Latitude (°)
- `gps_lng` : Longitude (°)
- `gps_alt` : Altitude (m)
- `gps_speed` : Vitesse (km/h)
- `gps_sats` : Satellites

## Utilisation

1. Ouvrez `gps_neo6m.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
