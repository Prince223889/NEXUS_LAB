# Lampe crépusculaire

Allume une lampe (relais) quand la luminosité passe sous 50 lx, avec hystérésis anti-clignotement.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 71 mA (pointe 71 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BH1750 (GY-30 / GY-302) | VCC | 3V3 |  |
| BH1750 (GY-30 / GY-302) | GND | GND |  |
| BH1750 (GY-30 / GY-302) | SDA | GPIO21 |  |
| BH1750 (GY-30 / GY-302) | SCL | GPIO22 |  |
| Module relais 5 V (1 canal) | VCC | 5V (VIN) |  |
| Module relais 5 V (1 canal) | GND | GND |  |
| Module relais 5 V (1 canal) | IN | GPIO4 |  |

## Bibliothèques

- **BH1750** 1.3.0 — https://github.com/claws/BH1750

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bh1750_lux` : Éclairement (lx)

## Utilisation

1. Ouvrez `app_lampe_crepusculaire.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
