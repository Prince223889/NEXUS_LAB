# Registre à décalage 74HC595

8 sorties supplémentaires avec 3 fils (chaînable) : barregraphe, afficheurs.

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Registre à décalage 74HC595 | VCC | 3V3 |  |
| Registre à décalage 74HC595 | GND | GND |  |
| Registre à décalage 74HC595 | DS (14) | GPIO4 |  |
| Registre à décalage 74HC595 | SH_CP (11) | GPIO13 |  |
| Registre à décalage 74HC595 | ST_CP (12) | GPIO14 |  |
| Registre à décalage 74HC595 | MR (10) | 3V3 |  |
| Registre à décalage 74HC595 | OE (13) | GND |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `hc595.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
