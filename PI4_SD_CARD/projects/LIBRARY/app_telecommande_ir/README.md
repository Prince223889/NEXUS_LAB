# Prise commandée par télécommande IR

La touche « 1 » (commande NEC 0x45) d'une télécommande allume le relais, toute autre touche l'éteint.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 71 mA (pointe 71 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Récepteur infrarouge VS1838B / TSOP38238 | VCC | 3V3 |  |
| Récepteur infrarouge VS1838B / TSOP38238 | GND | GND |  |
| Récepteur infrarouge VS1838B / TSOP38238 | OUT | GPIO34 |  |
| Module relais 5 V (1 canal) | VCC | 5V (VIN) |  |
| Module relais 5 V (1 canal) | GND | GND |  |
| Module relais 5 V (1 canal) | IN | GPIO4 |  |

## Bibliothèques

- **IRremote** 4.7.1 — https://github.com/Arduino-IRremote/Arduino-IRremote

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `irrx_cmd` : Dernière commande

## Utilisation

1. Ouvrez `app_telecommande_ir.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
