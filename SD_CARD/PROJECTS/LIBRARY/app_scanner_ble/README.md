# Détecteur de présence Bluetooth

Compte les appareils BLE à proximité (téléphones, montres) ; LED allumée si l'un est très proche.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 100 mA (pointe 100 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| LED + résistance 220 Ω | VCC | 3V3 |  |
| LED + résistance 220 Ω | GND | GND |  |
| LED + résistance 220 Ω | anode (+) via 220 Ω | GPIO4 | cathode (patte courte) vers GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ble_devices` : Appareils
- `ble_best` : Meilleur signal (dBm)

## Utilisation

1. Ouvrez `app_scanner_ble.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
