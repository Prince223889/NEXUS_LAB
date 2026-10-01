# Écran couleur TFT 1,8" ST7735 128×160 (SPI)

Écran couleur SPI 1,8 pouce : mesures en grands caractères colorés.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 50 mA (pointe 50 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | VCC | 3V3 |  |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | GND | GND |  |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | SCK | GPIO18 |  |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | SDA/MOSI | GPIO23 |  |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | CS | GPIO4 |  |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | A0/DC | GPIO13 |  |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | RESET | GPIO14 |  |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | LED | 3V3 (rétroéclairage) |  |

## Bibliothèques

- **Adafruit ST7735 and ST7789 Library** 1.11.0 — https://github.com/adafruit/Adafruit-ST7735-Library
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `tft_st7735.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
