# Émetteur 433 MHz (FS1000A)

Pilote des prises radiocommandées 433 MHz (codes relevés avec le récepteur).

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 20 mA (pointe 20 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Émetteur 433 MHz (FS1000A) | VCC | 5V (VIN) |  |
| Émetteur 433 MHz (FS1000A) | GND | GND |  |
| Émetteur 433 MHz (FS1000A) | DATA | GPIO4 |  |

## Bibliothèques

- **rc-switch** 2.6.4 — https://github.com/sui77/rc-switch

## Utilisation

1. Ouvrez `rf433_tx.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
