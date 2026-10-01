# Lecteur NFC PN532 (I2C)

Lecteur NFC polyvalent : badges MIFARE, NTAG, et même certains smartphones.

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 100 mA (pointe 100 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Lecteur NFC PN532 (I2C) | VCC | 3V3 |  |
| Lecteur NFC PN532 (I2C) | GND | GND |  |
| Lecteur NFC PN532 (I2C) | SDA | GPIO21 |  |
| Lecteur NFC PN532 (I2C) | SCL | GPIO22 |  |
| Lecteur NFC PN532 (I2C) | IRQ | GPIO34 |  |
| Lecteur NFC PN532 (I2C) | RSTO | GPIO4 |  |
| Lecteur NFC PN532 (I2C) | interrupteurs | I2C : SW1 = ON, SW2 = OFF | mode I2C du module rouge |

## Bibliothèques

- **Adafruit PN532** 1.3.4 — https://github.com/adafruit/Adafruit-PN532
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `nfc_reads` : Lectures

## Utilisation

1. Ouvrez `pn532.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
