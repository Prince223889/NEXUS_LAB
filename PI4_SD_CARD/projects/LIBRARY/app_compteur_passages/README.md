# Compteur de passages / visiteurs

Chaque coupure de la barrière IR incrémente le compteur affiché sur LCD et sur le web.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 31 mA (pointe 31 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Barrière infrarouge (émetteur + récepteur) | VCC | 3V3 |  |
| Barrière infrarouge (émetteur + récepteur) | GND | GND |  |
| Barrière infrarouge (émetteur + récepteur) | récepteur (collecteur ouvert) | GPIO4 |  |
| Écran LCD 16×2 + module I2C | VCC | 5V (VIN) |  |
| Écran LCD 16×2 + module I2C | GND | GND |  |
| Écran LCD 16×2 + module I2C | SDA | GPIO21 |  |
| Écran LCD 16×2 + module I2C | SCL | GPIO22 |  |

## Bibliothèques

- **LiquidCrystal I2C** 1.1.2 — https://github.com/johnrickman/LiquidCrystal_I2C

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `beam_cut` : Faisceau coupé
- `beam_passes` : Passages

## Utilisation

1. Ouvrez `app_compteur_passages.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
