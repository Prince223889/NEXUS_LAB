# Sharp GP2Y1010AU0F (poussière)

Capteur optique de poussière : densité en mg/m³ par impulsion infrarouge.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 11 mA (pointe 11 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Sharp GP2Y1010AU0F (poussière) | VCC | 5V (VIN) |  |
| Sharp GP2Y1010AU0F (poussière) | GND | GND |  |
| Sharp GP2Y1010AU0F (poussière) | LED (broche 3) | GPIO4 |  |
| Sharp GP2Y1010AU0F (poussière) | Vo (broche 5) | GPIO34 | via pont diviseur 10 kΩ / 20 kΩ (sortie jusqu'à 3,6 V) |
| Sharp GP2Y1010AU0F (poussière) | V-LED | 5V via 150 Ω + condensateur 220 µF vers GND | circuit recommandé par Sharp |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `gp2y_dust` : Poussière (mg/m³)

## Utilisation

1. Ouvrez `gp2y1010.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
