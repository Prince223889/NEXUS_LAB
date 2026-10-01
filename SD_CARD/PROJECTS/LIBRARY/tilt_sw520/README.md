# Capteur d'inclinaison SW-520D

Bille métallique qui ferme le contact au-delà d'environ 45°.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur d'inclinaison SW-520D | VCC | 3V3 |  |
| Capteur d'inclinaison SW-520D | GND | GND |  |
| Capteur d'inclinaison SW-520D | signal | GPIO4 | l'autre borne vers GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tilt_sw520_state` : État (0/1)
- `tilt_sw520_count` : Déclenchements

## Utilisation

1. Ouvrez `tilt_sw520.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
