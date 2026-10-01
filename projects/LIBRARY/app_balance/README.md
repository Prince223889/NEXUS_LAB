# Balance connectée (ruche, réservoir)

Pesée par cellule de charge, affichage OLED et envoi au MASTER.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 21.5 mA (pointe 21.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Balance HX711 + cellule de charge | VCC | 3V3 |  |
| Balance HX711 + cellule de charge | GND | GND |  |
| Balance HX711 + cellule de charge | DT | GPIO34 |  |
| Balance HX711 + cellule de charge | SCK | GPIO4 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **HX711 Arduino Library** 0.7.5 — https://github.com/bogde/HX711
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `scale_weight` : Poids (g)

## Utilisation

1. Ouvrez `app_balance.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
