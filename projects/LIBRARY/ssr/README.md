# Relais statique SSR G3MB-202P

Relais statique silencieux 2 A / 240 V AC, commutation au passage à zéro (charges résistives).

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 12 mA (pointe 12 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Relais statique SSR G3MB-202P | VCC | 5V (VIN) |  |
| Relais statique SSR G3MB-202P | GND | GND |  |
| Relais statique SSR G3MB-202P | IN | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- DANGER : le 230 V doit être câblé par une personne qualifiée, dans un boîtier isolé.
- La plupart des modules 1 relais sont actifs à l'état bas (LED allumée quand IN = 0).

## Utilisation

1. Ouvrez `ssr.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
