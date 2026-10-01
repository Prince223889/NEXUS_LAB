# Thermistance CTN 10 kΩ

Thermistance NTC 10 kΩ (B = 3950) en pont diviseur avec une résistance fixe de 10 kΩ.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Thermistance CTN 10 kΩ | VCC | 3V3 |  |
| Thermistance CTN 10 kΩ | GND | GND |  |
| Thermistance CTN 10 kΩ | point milieu | GPIO34 | CTN entre 3V3 et le point milieu, 10 kΩ entre le point milieu et GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ntc_temp` : Température (°C)

## Utilisation

1. Ouvrez `ntc.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
