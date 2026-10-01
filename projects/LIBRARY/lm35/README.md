# LM35

Capteur analogique linéaire : 10 mV/°C, de 2 à 150 °C.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LM35 | VCC | 5V (VIN) |  |
| LM35 | GND | GND |  |
| LM35 | VOUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `lm35_temp` : Température (°C)

## Points d'attention

- Alimentation 4-30 V : utilisez le 5 V, la sortie (≤ 1,5 V) reste compatible avec l'ADC.

## Utilisation

1. Ouvrez `lm35.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
