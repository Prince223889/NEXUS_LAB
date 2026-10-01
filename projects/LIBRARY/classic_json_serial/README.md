# Échanges JSON sur le port série

Piloter la carte depuis un PC (Python) en JSON avec ArduinoJson.

- **Catégorie** : Classiques ESP32 (système & réseau)
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 0 mA (pointe 0 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|

## Bibliothèques

- **ArduinoJson** 7.4.3 — https://github.com/bblanchon/ArduinoJson

## Utilisation

1. Ouvrez `classic_json_serial.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
