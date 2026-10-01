# Fin de course mécanique

Micro-rupteur à levier : butée d'axe, détection de porte, imprimante 3D.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Fin de course mécanique | VCC | 3V3 |  |
| Fin de course mécanique | GND | GND |  |
| Fin de course mécanique | signal | GPIO4 | l'autre borne vers GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `limit_switch_state` : État (0/1)
- `limit_switch_count` : Déclenchements

## Utilisation

1. Ouvrez `limit_switch.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
