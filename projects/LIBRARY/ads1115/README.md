# ADS1115 (CAN 16 bits, 4 voies)

Convertisseur analogique-numérique 16 bits avec gain programmable : bien plus précis que l'ADC interne.

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| ADS1115 (CAN 16 bits, 4 voies) | VCC | 3V3 |  |
| ADS1115 (CAN 16 bits, 4 voies) | GND | GND |  |
| ADS1115 (CAN 16 bits, 4 voies) | SDA | GPIO21 |  |
| ADS1115 (CAN 16 bits, 4 voies) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit ADS1X15** 2.6.2 — https://github.com/adafruit/Adafruit_ADS1X15
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ads_a0` : A0 (V)
- `ads_a1` : A1 (V)
- `ads_a2` : A2 (V)
- `ads_a3` : A3 (V)

## Points d'attention

- Ne dépassez jamais VDD + 0,3 V sur une entrée, quel que soit le gain.

## Utilisation

1. Ouvrez `ads1115.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
