# Module mesure de tension 0-25 V

Pont diviseur 30 kΩ / 7,5 kΩ (rapport 5) : batterie 12 V, panneau solaire.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Module mesure de tension 0-25 V | VCC | 3V3 |  |
| Module mesure de tension 0-25 V | GND | GND |  |
| Module mesure de tension 0-25 V | S | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `vdiv_volt` : Tension (V)

## Points d'attention

- En 3,3 V la tension mesurable maximale est ~16,5 V (3,3 × 5) : ne dépassez pas.

## Utilisation

1. Ouvrez `voltage_divider.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
