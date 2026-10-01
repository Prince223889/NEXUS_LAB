# DHT22 / AM2302

Capteur précis : -40 à 80 °C (±0,5 °C), 0-100 % HR (±2 %).

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1.5 mA (pointe 1.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| DHT22 / AM2302 | VCC | 3V3 |  |
| DHT22 / AM2302 | GND | GND |  |
| DHT22 / AM2302 | DATA | GPIO4 | résistance de tirage 10 kΩ vers 3V3 (souvent déjà sur le module) |

## Bibliothèques

- **DHT sensor library** 1.4.7 — https://github.com/adafruit/DHT-sensor-library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `dht22_temp` : Température (°C)
- `dht22_hum` : Humidité (%)

## Points d'attention

- Ne pas interroger plus souvent qu'une fois toutes les 2 s.
- Le premier relevé après la mise sous tension peut être « nan ».

## Utilisation

1. Ouvrez `dht22.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
