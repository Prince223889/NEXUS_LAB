# Station météo extérieure complète

Kit météo : température/humidité, vitesse et direction du vent, cumul de pluie, détecteur de pluie, avec page web.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 5.5 mA (pointe 5.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| DHT22 / AM2302 | VCC | 3V3 |  |
| DHT22 / AM2302 | GND | GND |  |
| DHT22 / AM2302 | DATA | GPIO4 | résistance de tirage 10 kΩ vers 3V3 (souvent déjà sur le module) |
| Anémomètre à impulsions | VCC | 3V3 |  |
| Anémomètre à impulsions | GND | GND |  |
| Anémomètre à impulsions | fil 1 | GPIO13 | fil 2 vers GND |
| Girouette à résistances | VCC | 3V3 |  |
| Girouette à résistances | GND | GND |  |
| Girouette à résistances | fil 1 | GPIO34 | 10 kΩ entre 3V3 et le point de mesure, fil 2 vers GND |
| Pluviomètre à auget | VCC | 3V3 |  |
| Pluviomètre à auget | GND | GND |  |
| Pluviomètre à auget | fil 1 | GPIO14 | fil 2 vers GND |
| Capteur de pluie FC-37 / YL-83 | VCC | 3V3 |  |
| Capteur de pluie FC-37 / YL-83 | GND | GND |  |
| Capteur de pluie FC-37 / YL-83 | AO | GPIO35 |  |
| Capteur de pluie FC-37 / YL-83 | DO | GPIO36 |  |

## Bibliothèques

- **DHT sensor library** 1.4.7 — https://github.com/adafruit/DHT-sensor-library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `dht22_temp` : Température (°C)
- `dht22_hum` : Humidité (%)
- `wind_speed` : Vitesse du vent (km/h)
- `vane_deg` : Direction (0 = nord) (°)
- `pluvio_total` : Cumul de pluie (mm)
- `rain_wet` : Humidité plaque (%)
- `rain_rain` : Pluie (0/1)

## Utilisation

1. Ouvrez `app_station_meteo_ext.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
