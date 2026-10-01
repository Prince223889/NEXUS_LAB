# Ampli I2S MAX98357A + haut-parleur

Amplificateur numérique 3 W classe D : génère un signal sinusoïdal par I2S (sirène, notes).

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 5 mA (pointe 650 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Ampli I2S MAX98357A + haut-parleur | VCC | 5V (VIN) |  |
| Ampli I2S MAX98357A + haut-parleur | GND | GND |  |
| Ampli I2S MAX98357A + haut-parleur | BCLK | GPIO4 |  |
| Ampli I2S MAX98357A + haut-parleur | LRC | GPIO13 |  |
| Ampli I2S MAX98357A + haut-parleur | DIN | GPIO14 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Consommation de pointe estimée 730 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Ampli I2S MAX98357A + haut-parleur directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `max98357.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
