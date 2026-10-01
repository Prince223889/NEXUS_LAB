# Écran OLED 1,3" SH1106 128×64 (I2C)

Écran OLED 1,3 pouce (contrôleur SH1106, souvent confondu avec le SSD1306).

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 20 mA (pointe 20 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Écran OLED 1,3" SH1106 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 1,3" SH1106 128×64 (I2C) | GND | GND |  |
| Écran OLED 1,3" SH1106 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 1,3" SH1106 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SH110X** 2.1.15 — https://github.com/adafruit/Adafruit_SH110X
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Points d'attention

- Si l'image est décalée de 2 pixels avec la bibliothèque SSD1306, c'est un SH1106 : utilisez ce module.

## Utilisation

1. Ouvrez `oled_sh1106.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
