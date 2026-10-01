# Humidité du sol capacitive v1.2

Sonde capacitive sans électrode exposée : ne se corrode pas, idéale pour l'arrosage automatique.

- **Catégorie** : Météo, sol & UV
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Humidité du sol capacitive v1.2 | VCC | 3V3 |  |
| Humidité du sol capacitive v1.2 | GND | GND |  |
| Humidité du sol capacitive v1.2 | AOUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `soil_moist` : Humidité du sol (%)
- `soil_mv` : Tension (mV)

## Points d'attention

- Étalonnez « sec » (à l'air) et « mouillé » (dans un verre d'eau) pour votre sonde.
- Certaines copies n'ont pas le régulateur 3,3 V : alimentez-les en 3V3.

## Utilisation

1. Ouvrez `soil_cap.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
