# Capteur domotique MQTT (Home Assistant)

Température/humidité et relais publiés sur un broker MQTT (Mosquitto, Home Assistant).

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 71 mA (pointe 71 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SHT31 | VCC | 3V3 |  |
| SHT31 | GND | GND |  |
| SHT31 | SDA | GPIO21 |  |
| SHT31 | SCL | GPIO22 |  |
| Module relais 5 V (1 canal) | VCC | 5V (VIN) |  |
| Module relais 5 V (1 canal) | GND | GND |  |
| Module relais 5 V (1 canal) | IN | GPIO4 |  |

## Bibliothèques

- **Adafruit SHT31 Library** 2.2.2 — https://github.com/adafruit/Adafruit_SHT31
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **PubSubClient** 2.8 — https://github.com/knolleary/pubsubclient

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sht31_temp` : Température (°C)
- `sht31_hum` : Humidité (%)

## Utilisation

1. Ouvrez `app_mqtt_domotique.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
