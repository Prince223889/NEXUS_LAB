# Scanner Bluetooth Low Energy (intégré)

Utilise le BLE intégré de l'ESP32 : compte les appareils à proximité et le signal le plus fort.

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 90 mA (pointe 90 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ble_devices` : Appareils
- `ble_best` : Meilleur signal (dBm)

## Points d'attention

- Le scan BLE bloque ~3 s : gardez une période d'au moins 10 s.

## Utilisation

1. Ouvrez `ble_scanner.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
