# Passerelle prises radio 433 MHz

Pilote une prise radiocommandée 433 MHz selon la température, et publie les mesures en MQTT.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 21 mA (pointe 21 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| AHT10 / AHT20 / AHT21 | VCC | 3V3 |  |
| AHT10 / AHT20 / AHT21 | GND | GND |  |
| AHT10 / AHT20 / AHT21 | SDA | GPIO21 |  |
| AHT10 / AHT20 / AHT21 | SCL | GPIO22 |  |
| Émetteur 433 MHz (FS1000A) | VCC | 5V (VIN) |  |
| Émetteur 433 MHz (FS1000A) | GND | GND |  |
| Émetteur 433 MHz (FS1000A) | DATA | GPIO4 |  |

## Bibliothèques

- **Adafruit AHTX0** 2.0.6 — https://github.com/adafruit/Adafruit_AHTX0
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **rc-switch** 2.6.4 — https://github.com/sui77/rc-switch
- **PubSubClient** 2.8 — https://github.com/knolleary/pubsubclient

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `aht20_temp` : Température (°C)
- `aht20_hum` : Humidité (%)

## Utilisation

1. Ouvrez `app_prise_radio.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
