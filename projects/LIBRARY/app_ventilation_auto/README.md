# Ventilateur proportionnel à la température

La vitesse du ventilateur 4 fils suit la température : 20 % à 22 °C, 100 % à 32 °C.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 6.5 mA (pointe 6.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| DHT22 / AM2302 | VCC | 3V3 |  |
| DHT22 / AM2302 | GND | GND |  |
| DHT22 / AM2302 | DATA | GPIO4 | résistance de tirage 10 kΩ vers 3V3 (souvent déjà sur le module) |
| Ventilateur PC 4 fils (PWM 25 kHz) | VCC | 5V (VIN) |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | GND | GND |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | PWM (bleu) | GPIO14 |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | TACH (vert) | GPIO13 |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | +12 V (jaune) | alimentation 12 V externe | GND commun avec l'ESP32 |

## Bibliothèques

- **DHT sensor library** 1.4.7 — https://github.com/adafruit/DHT-sensor-library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `dht22_temp` : Température (°C)
- `dht22_hum` : Humidité (%)
- `fan_rpm` : Vitesse (tr/min)
- `fan_duty` : Consigne (%)

## Utilisation

1. Ouvrez `app_ventilation_auto.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
