# Compteur d'énergie domestique

Tension, courant, puissance, kWh et facteur de puissance, publiés en web, MQTT et vers le MASTER.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| PZEM-004T v3 (compteur d'énergie) | VCC | 5V (VIN) |  |
| PZEM-004T v3 (compteur d'énergie) | GND | GND |  |
| PZEM-004T v3 (compteur d'énergie) | TX du PZEM | GPIO16 |  |
| PZEM-004T v3 (compteur d'énergie) | RX du PZEM | GPIO17 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **PZEM004Tv30** 1.2.1 — https://github.com/mandulaj/PZEM-004T-v30
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **PubSubClient** 2.8 — https://github.com/knolleary/pubsubclient

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pzem_volt` : Tension (V)
- `pzem_curr` : Courant (A)
- `pzem_power` : Puissance (W)
- `pzem_energy` : Énergie (kWh)
- `pzem_freq` : Fréquence (Hz)
- `pzem_pf` : Facteur de puissance

## Utilisation

1. Ouvrez `app_compteur_energie.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
