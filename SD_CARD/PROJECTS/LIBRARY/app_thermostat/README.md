# Thermostat de chauffage

Enclenche un radiateur (via relais) sous 19 °C avec hystérésis de 0,5 °C ; affichage OLED.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 91.5 mA (pointe 91.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| DS18B20 | VCC | 3V3 |  |
| DS18B20 | GND | GND |  |
| DS18B20 | DATA | GPIO4 | résistance de tirage 4,7 kΩ entre DATA et 3V3 obligatoire |
| Module relais 5 V (1 canal) | VCC | 5V (VIN) |  |
| Module relais 5 V (1 canal) | GND | GND |  |
| Module relais 5 V (1 canal) | IN | GPIO13 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **OneWire** 2.3.8 — https://github.com/PaulStoffregen/OneWire
- **DallasTemperature** 4.0.6 — https://github.com/milesburton/Arduino-Temperature-Control-Library
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ds18b20_temp` : Température (°C)

## Utilisation

1. Ouvrez `app_thermostat.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
