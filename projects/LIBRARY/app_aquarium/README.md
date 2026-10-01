# Contrôleur d'aquarium

Température (chauffage sous 24,5 °C), pH et TDS de l'eau, page web de suivi.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 82.5 mA (pointe 82.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| DS18B20 | VCC | 3V3 |  |
| DS18B20 | GND | GND |  |
| DS18B20 | DATA | GPIO4 | résistance de tirage 4,7 kΩ entre DATA et 3V3 obligatoire |
| Sonde pH (module PH-4502C / SEN0161) | VCC | 5V (VIN) |  |
| Sonde pH (module PH-4502C / SEN0161) | GND | GND |  |
| Sonde pH (module PH-4502C / SEN0161) | Po | GPIO34 | via pont diviseur si la sortie dépasse 3,3 V |
| Sonde TDS (conductivité) | VCC | 3V3 |  |
| Sonde TDS (conductivité) | GND | GND |  |
| Sonde TDS (conductivité) | A | GPIO35 |  |
| Module relais 5 V (1 canal) | VCC | 5V (VIN) |  |
| Module relais 5 V (1 canal) | GND | GND |  |
| Module relais 5 V (1 canal) | IN | GPIO13 |  |

## Bibliothèques

- **OneWire** 2.3.8 — https://github.com/PaulStoffregen/OneWire
- **DallasTemperature** 4.0.6 — https://github.com/milesburton/Arduino-Temperature-Control-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ds18b20_temp` : Température (°C)
- `ph_ph` : pH (pH)
- `ph_mv` : Tension (mV)
- `tds_tds` : TDS (ppm)

## Utilisation

1. Ouvrez `app_aquarium.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
