# Afficheur 4 chiffres HT16K33 (I2C)

Afficheur 7 segments « backpack » Adafruit sur I2C.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 20 mA (pointe 20 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Afficheur 4 chiffres HT16K33 (I2C) | VCC | 3V3 |  |
| Afficheur 4 chiffres HT16K33 (I2C) | GND | GND |  |
| Afficheur 4 chiffres HT16K33 (I2C) | SDA | GPIO21 |  |
| Afficheur 4 chiffres HT16K33 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit LED Backpack Library** 1.5.1 — https://github.com/adafruit/Adafruit_LED_Backpack
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `ht16k33_7seg.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
