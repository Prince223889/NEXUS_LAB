# Capteur distant LoRa (plusieurs km)

Envoie température, humidité et pression par radio LoRa toutes les 10 s.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 13 mA (pointe 121 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BME280 | VCC | 3V3 |  |
| BME280 | GND | GND |  |
| BME280 | SDA | GPIO21 |  |
| BME280 | SCL | GPIO22 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | VCC | 3V3 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | GND | GND |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | SCK | GPIO18 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | MISO | GPIO19 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | MOSI | GPIO23 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | NSS | GPIO4 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | RST | GPIO13 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | DIO0 | GPIO34 |  |

## Bibliothèques

- **Adafruit BME280 Library** 2.3.0 — https://github.com/adafruit/Adafruit_BME280_Library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **LoRa** 0.8.0 — https://github.com/sandeepmistry/arduino-LoRa

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bme280_temp` : Température (°C)
- `bme280_hum` : Humidité (%)
- `bme280_press` : Pression (hPa)
- `bme280_alt` : Altitude (m)
- `lora_sent` : Paquets envoyés
- `lora_rssi` : RSSI dernier reçu (dBm)

## Utilisation

1. Ouvrez `app_capteur_lora.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
