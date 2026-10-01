# ADXL335 (accéléromètre analogique)

Accéléromètre ±3 g à trois sorties analogiques (330 mV/g, zéro à 1,65 V).

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| ADXL335 (accéléromètre analogique) | VCC | 3V3 |  |
| ADXL335 (accéléromètre analogique) | GND | GND |  |
| ADXL335 (accéléromètre analogique) | X | GPIO34 |  |
| ADXL335 (accéléromètre analogique) | Y | GPIO35 |  |
| ADXL335 (accéléromètre analogique) | Z | GPIO32 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `adxl335_gx` : X (g)
- `adxl335_gy` : Y (g)
- `adxl335_gz` : Z (g)

## Utilisation

1. Ouvrez `adxl335.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
