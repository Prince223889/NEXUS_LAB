# Module carte microSD (SPI)

Enregistreur de données : écrit toutes les mesures du projet dans un fichier CSV (Excel/LibreOffice).

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 50 mA (pointe 100 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Module carte microSD (SPI) | VCC | 3V3 |  |
| Module carte microSD (SPI) | GND | GND |  |
| Module carte microSD (SPI) | SCK | GPIO18 |  |
| Module carte microSD (SPI) | MISO | GPIO19 |  |
| Module carte microSD (SPI) | MOSI | GPIO23 |  |
| Module carte microSD (SPI) | CS | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sd_count` : Lignes écrites
- `sd_used` : Espace utilisé (Ko)

## Points d'attention

- Carte formatée en FAT32.
- Beaucoup de modules ont un régulateur 5 V → 3,3 V : alimentez-les en 5 V.

## Utilisation

1. Ouvrez `sd_card.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
