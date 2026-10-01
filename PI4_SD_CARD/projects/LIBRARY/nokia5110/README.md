# Écran Nokia 5110 PCD8544 84×48 (SPI)

L'écran du téléphone Nokia 3310 : très basse consommation, rétroéclairage bleu.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Écran Nokia 5110 PCD8544 84×48 (SPI) | VCC | 3V3 |  |
| Écran Nokia 5110 PCD8544 84×48 (SPI) | GND | GND |  |
| Écran Nokia 5110 PCD8544 84×48 (SPI) | SCK | GPIO18 |  |
| Écran Nokia 5110 PCD8544 84×48 (SPI) | SDA/MOSI | GPIO23 |  |
| Écran Nokia 5110 PCD8544 84×48 (SPI) | CE | GPIO4 |  |
| Écran Nokia 5110 PCD8544 84×48 (SPI) | DC | GPIO13 |  |
| Écran Nokia 5110 PCD8544 84×48 (SPI) | RST | GPIO14 |  |

## Bibliothèques

- **Adafruit PCD8544 Nokia 5110 LCD library** 2.0.3 — https://github.com/adafruit/Adafruit-PCD8544-Nokia-5110-LCD-library
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `nokia5110.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
