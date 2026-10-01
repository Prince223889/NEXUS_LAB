# Touche capacitive intégrée ESP32

Un simple fil ou une pastille de cuivre sur une broche TOUCH devient un bouton tactile.

- **Catégorie** : Boutons, claviers & commandes
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Touche capacitive intégrée ESP32 | VCC | 3V3 |  |
| Touche capacitive intégrée ESP32 | GND | GND |  |
| Touche capacitive intégrée ESP32 | pastille / fil | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `etouch_touched` : Touché (0/1)
- `etouch_raw` : Valeur brute

## Utilisation

1. Ouvrez `esp_touch.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
