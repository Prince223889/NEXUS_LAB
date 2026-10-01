# Capteur connecté au tableau de bord du MASTER

Rejoint le Wi-Fi « ESP32-LAB » et envoie ses mesures au MASTER (onglet Capteurs).

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 2 mA (pointe 2 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SHT40 / SHT41 / SHT45 | VCC | 3V3 |  |
| SHT40 / SHT41 / SHT45 | GND | GND |  |
| SHT40 / SHT41 / SHT45 | SDA | GPIO21 |  |
| SHT40 / SHT41 / SHT45 | SCL | GPIO22 |  |
| BH1750 (GY-30 / GY-302) | VCC | 3V3 |  |
| BH1750 (GY-30 / GY-302) | GND | GND |  |
| BH1750 (GY-30 / GY-302) | SDA | GPIO21 |  |
| BH1750 (GY-30 / GY-302) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SHT4x Library** 1.0.5 — https://github.com/adafruit/Adafruit_SHT4X
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **BH1750** 1.3.0 — https://github.com/claws/BH1750

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sht4x_temp` : Température (°C)
- `sht4x_hum` : Humidité (%)
- `bh1750_lux` : Éclairement (lx)

## Utilisation

1. Ouvrez `app_capteur_master.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
