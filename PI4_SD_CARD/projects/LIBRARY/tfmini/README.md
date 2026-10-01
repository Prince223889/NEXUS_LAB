# Benewake TFmini / TF-Luna (LiDAR)

LiDAR ToF 0,2-8 m (TF-Luna) / 12 m (TFmini) à 100 Hz, trame série 9 octets.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 70 mA (pointe 70 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Benewake TFmini / TF-Luna (LiDAR) | VCC | 5V (VIN) |  |
| Benewake TFmini / TF-Luna (LiDAR) | GND | GND |  |
| Benewake TFmini / TF-Luna (LiDAR) | TX du LiDAR | GPIO16 |  |
| Benewake TFmini / TF-Luna (LiDAR) | RX du LiDAR | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tfmini_dist` : Distance (cm)
- `tfmini_strength` : Intensité du signal

## Utilisation

1. Ouvrez `tfmini.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
