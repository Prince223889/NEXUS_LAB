# LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95)

Radio longue portée (plusieurs km) : envoie un paquet périodique et affiche les paquets reçus avec le RSSI.

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 12 mA (pointe 120 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | VCC | 3V3 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | GND | GND |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | SCK | GPIO18 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | MISO | GPIO19 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | MOSI | GPIO23 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | NSS | GPIO4 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | RST | GPIO13 |  |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | DIO0 | GPIO34 |  |

## Bibliothèques

- **LoRa** 0.8.0 — https://github.com/sandeepmistry/arduino-LoRa

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `lora_sent` : Paquets envoyés
- `lora_rssi` : RSSI dernier reçu (dBm)

## Points d'attention

- En Europe : 868 MHz (ou 433 MHz), rapport cyclique ≤ 1 %.
- Ne jamais émettre sans antenne.

## Utilisation

1. Ouvrez `lora_sx1278.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
