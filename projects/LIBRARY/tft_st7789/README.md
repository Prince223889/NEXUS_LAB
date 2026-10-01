# Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI)

Écran IPS carré haute définition, angles de vision larges.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 60 mA (pointe 60 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | VCC | 3V3 |  |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | GND | GND |  |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | SCK | GPIO18 |  |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | SDA/MOSI | GPIO23 |  |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | CS (si présent) | GPIO4 |  |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | DC | GPIO13 |  |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | RES | GPIO14 |  |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | BLK | 3V3 (rétroéclairage) |  |

## Bibliothèques

- **Adafruit ST7735 and ST7789 Library** 1.11.0 — https://github.com/adafruit/Adafruit-ST7735-Library
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `tft_st7789.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
