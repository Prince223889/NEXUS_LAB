# QMC5883L (boussole GY-273 récente)

Magnétomètre 3 axes QST, piloté directement par registres.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| QMC5883L (boussole GY-273 récente) | VCC | 3V3 |  |
| QMC5883L (boussole GY-273 récente) | GND | GND |  |
| QMC5883L (boussole GY-273 récente) | SDA | GPIO21 |  |
| QMC5883L (boussole GY-273 récente) | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `qmc5883_heading` : Cap magnétique (°)

## Utilisation

1. Ouvrez `qmc5883l.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
