# Alerte UV plage

Indice UV sur OLED et bip au-dessus de l'indice 6 (protection solaire).

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 46 mA (pointe 46 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LTR390 (UV + lumière) | VCC | 3V3 |  |
| LTR390 (UV + lumière) | GND | GND |  |
| LTR390 (UV + lumière) | SDA | GPIO21 |  |
| LTR390 (UV + lumière) | SCL | GPIO22 |  |
| Buzzer actif 5 V | VCC | 3V3 |  |
| Buzzer actif 5 V | GND | GND |  |
| Buzzer actif 5 V | + (via transistor si > 20 mA) | GPIO4 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit LTR390 Library** 1.1.2 — https://github.com/adafruit/Adafruit_LTR390
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ltr390_uvi` : Indice UV
- `ltr390_uvs` : UVS brut

## Utilisation

1. Ouvrez `app_uv_plage.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
