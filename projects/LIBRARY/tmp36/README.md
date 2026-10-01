# TMP36

Capteur analogique -40 à 125 °C : 10 mV/°C avec décalage de 500 mV.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| TMP36 | VCC | 3V3 |  |
| TMP36 | GND | GND |  |
| TMP36 | VOUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tmp36_temp` : Température (°C)

## Points d'attention

- Fonctionne dès 2,7 V : alimentez-le en 3V3.

## Utilisation

1. Ouvrez `tmp36.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
