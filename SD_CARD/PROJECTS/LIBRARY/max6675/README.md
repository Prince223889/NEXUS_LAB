# MAX6675 + thermocouple K

Convertisseur thermocouple type K : 0 à 1024 °C, résolution 0,25 °C (lecture SPI logicielle).

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MAX6675 + thermocouple K | VCC | 3V3 |  |
| MAX6675 + thermocouple K | GND | GND |  |
| MAX6675 + thermocouple K | SCK | GPIO4 |  |
| MAX6675 + thermocouple K | CS | GPIO13 |  |
| MAX6675 + thermocouple K | SO | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `max6675_temp` : Température (°C)

## Points d'attention

- Conversion toutes les 220 ms : ne pas lire plus vite.
- Respecter la polarité du thermocouple (+ jaune / - rouge en norme ANSI).

## Utilisation

1. Ouvrez `max6675.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
