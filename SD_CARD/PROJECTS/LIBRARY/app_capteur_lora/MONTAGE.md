# Capteur distant LoRa (plusieurs km)

Envoie température, humidité et pression par radio LoRa toutes les 10 s.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | BME280 | VCC | rouge |  |
| GND | BME280 | GND | noir |  |
| GPIO21 | BME280 | SDA | turquoise |  |
| GPIO22 | BME280 | SCL | rose |  |
| 3V3 | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | VCC | rouge |  |
| GND | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | GND | noir |  |
| GPIO18 | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | SCK | violet |  |
| GPIO19 | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | MISO | gris-bleu |  |
| GPIO23 | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | MOSI | indigo |  |
| GPIO4 | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | NSS | bleu |  |
| GPIO13 | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | RST | vert |  |
| GPIO34 | LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | DIO0 | marron |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
