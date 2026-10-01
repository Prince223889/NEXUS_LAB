# PCF8591 (CAN/CNA 8 bits)

Module 4 entrées analogiques + 1 sortie (souvent livré avec LDR, thermistance et potentiomètre).

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| PCF8591 (CAN/CNA 8 bits) | VCC | 3V3 |  |
| PCF8591 (CAN/CNA 8 bits) | GND | GND |  |
| PCF8591 (CAN/CNA 8 bits) | SDA | GPIO21 |  |
| PCF8591 (CAN/CNA 8 bits) | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pcf8591_ain0` : AIN0
- `pcf8591_ain1` : AIN1
- `pcf8591_ain2` : AIN2
- `pcf8591_ain3` : AIN3

## Utilisation

1. Ouvrez `pcf8591.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
