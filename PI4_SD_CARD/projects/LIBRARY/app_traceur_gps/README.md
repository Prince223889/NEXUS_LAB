# Traceur GPS avec enregistrement

Position, altitude et vitesse enregistrées sur microSD et affichées sur OLED.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 115 mA (pointe 165 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| GPS u-blox NEO-6M / NEO-M8N | VCC | 3V3 |  |
| GPS u-blox NEO-6M / NEO-M8N | GND | GND |  |
| GPS u-blox NEO-6M / NEO-M8N | TX du GPS | GPIO16 |  |
| GPS u-blox NEO-6M / NEO-M8N | RX du GPS | GPIO17 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |
| Module carte microSD (SPI) | VCC | 3V3 |  |
| Module carte microSD (SPI) | GND | GND |  |
| Module carte microSD (SPI) | SCK | GPIO18 |  |
| Module carte microSD (SPI) | MISO | GPIO19 |  |
| Module carte microSD (SPI) | MOSI | GPIO23 |  |
| Module carte microSD (SPI) | CS | GPIO4 |  |

## Bibliothèques

- **TinyGPSPlus** 1.0.3 — https://github.com/mikalhart/TinyGPSPlus
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `gps_lat` : Latitude (°)
- `gps_lng` : Longitude (°)
- `gps_alt` : Altitude (m)
- `gps_speed` : Vitesse (km/h)
- `gps_sats` : Satellites
- `sd_count` : Lignes écrites
- `sd_used` : Espace utilisé (Ko)

## Utilisation

1. Ouvrez `app_traceur_gps.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
