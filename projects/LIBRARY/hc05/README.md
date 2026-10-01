# Bluetooth HC-05 / HC-06 (série)

Pont série Bluetooth classique : dialogue avec une application Android « terminal Bluetooth ».

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Bluetooth HC-05 / HC-06 (série) | VCC | 5V (VIN) |  |
| Bluetooth HC-05 / HC-06 (série) | GND | GND |  |
| Bluetooth HC-05 / HC-06 (série) | TXD du HC-05 | GPIO16 |  |
| Bluetooth HC-05 / HC-06 (série) | RXD du HC-05 | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Le HC-05 accepte 3,3 V sur RXD ; son TXD (3,3 V) est compatible.
- Code d'appairage par défaut : 1234.
- L'ESP32 classique a aussi le Bluetooth intégré (bibliothèque BluetoothSerial).

## Utilisation

1. Ouvrez `hc05.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
