# Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI)

Grand écran couleur 320×240 : tableau de bord lisible de loin.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 90 mA (pointe 90 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | VCC | 3V3 |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | GND | GND |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | SCK | GPIO18 |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | SDA/MOSI | GPIO23 |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | SDO/MISO | GPIO19 |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | CS | GPIO4 |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | DC | GPIO13 |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | RESET | GPIO14 |  |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | LED | 3V3 via 10-47 Ω |  |

## Bibliothèques

- **Adafruit ILI9341** 1.6.4 — https://github.com/adafruit/Adafruit_ILI9341
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `tft_ili9341.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
