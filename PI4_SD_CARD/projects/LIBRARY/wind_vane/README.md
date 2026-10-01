# Girouette à résistances

Girouette 16 positions (kit météo) : direction du vent en degrés via un pont diviseur 10 kΩ.

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Girouette à résistances | VCC | 3V3 |  |
| Girouette à résistances | GND | GND |  |
| Girouette à résistances | fil 1 | GPIO34 | 10 kΩ entre 3V3 et le point de mesure, fil 2 vers GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `vane_deg` : Direction (0 = nord) (°)

## Utilisation

1. Ouvrez `wind_vane.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
