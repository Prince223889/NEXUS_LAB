# Analyseur de qualité de l'eau

pH, solides dissous et turbidité mesurés ensemble, journalisés sur microSD.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 101 mA (pointe 151 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Sonde pH (module PH-4502C / SEN0161) | VCC | 5V (VIN) |  |
| Sonde pH (module PH-4502C / SEN0161) | GND | GND |  |
| Sonde pH (module PH-4502C / SEN0161) | Po | GPIO34 | via pont diviseur si la sortie dépasse 3,3 V |
| Sonde TDS (conductivité) | VCC | 3V3 |  |
| Sonde TDS (conductivité) | GND | GND |  |
| Sonde TDS (conductivité) | A | GPIO35 |  |
| Capteur de turbidité | VCC | 5V (VIN) |  |
| Capteur de turbidité | GND | GND |  |
| Capteur de turbidité | OUT (A) | GPIO32 | via pont diviseur 10 kΩ / 20 kΩ (sortie 0-4,5 V) |
| Module carte microSD (SPI) | VCC | 3V3 |  |
| Module carte microSD (SPI) | GND | GND |  |
| Module carte microSD (SPI) | SCK | GPIO18 |  |
| Module carte microSD (SPI) | MISO | GPIO19 |  |
| Module carte microSD (SPI) | MOSI | GPIO23 |  |
| Module carte microSD (SPI) | CS | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ph_ph` : pH (pH)
- `ph_mv` : Tension (mV)
- `tds_tds` : TDS (ppm)
- `turb_ntu` : Turbidité (NTU)
- `turb_volt` : Tension (V)
- `sd_count` : Lignes écrites
- `sd_used` : Espace utilisé (Ko)

## Utilisation

1. Ouvrez `app_qualite_eau.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
