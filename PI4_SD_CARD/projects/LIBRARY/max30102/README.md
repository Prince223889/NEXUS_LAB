# MAX30102 (pouls & SpO₂)

Capteur optique rouge + infrarouge : fréquence cardiaque et présence du doigt.

- **Catégorie** : Santé, son & biométrie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MAX30102 (pouls & SpO₂) | VCC | 3V3 |  |
| MAX30102 (pouls & SpO₂) | GND | GND |  |
| MAX30102 (pouls & SpO₂) | SDA | GPIO21 |  |
| MAX30102 (pouls & SpO₂) | SCL | GPIO22 |  |

## Bibliothèques

- **SparkFun MAX3010x Pulse and Proximity Sensor Library** 1.1.2 — https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `max30102_bpm` : Fréquence cardiaque (BPM)
- `max30102_finger` : Doigt posé

## Points d'attention

- Beaucoup de modules violets ont une erreur de régulateur 1,8 V : vérifiez la tension sur SDA/SCL (doit être 3,3 V).

## Utilisation

1. Ouvrez `max30102.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
