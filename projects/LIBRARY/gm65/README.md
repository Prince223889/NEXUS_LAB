# Lecteur de codes-barres / QR GM65

Scanne codes-barres 1D et QR codes et les transmet en texte (9600 bauds).

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 120 mA (pointe 120 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Lecteur de codes-barres / QR GM65 | VCC | 5V (VIN) |  |
| Lecteur de codes-barres / QR GM65 | GND | GND |  |
| Lecteur de codes-barres / QR GM65 | TX du lecteur | GPIO16 |  |
| Lecteur de codes-barres / QR GM65 | RX du lecteur | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `gm65.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
