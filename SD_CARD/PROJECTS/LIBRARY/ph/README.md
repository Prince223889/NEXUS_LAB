# Sonde pH (module PH-4502C / SEN0161)

Mesure du pH de 0 à 14 avec étalonnage deux points (tampons pH 4 et pH 7).

- **Catégorie** : Eau & aquariophilie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 10 mA (pointe 10 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Sonde pH (module PH-4502C / SEN0161) | VCC | 5V (VIN) |  |
| Sonde pH (module PH-4502C / SEN0161) | GND | GND |  |
| Sonde pH (module PH-4502C / SEN0161) | Po | GPIO34 | via pont diviseur si la sortie dépasse 3,3 V |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ph_ph` : pH (pH)
- `ph_mv` : Tension (mV)

## Points d'attention

- Rincez la sonde à l'eau distillée entre deux solutions.
- Ne laissez jamais l'électrode sécher : conservez-la dans sa solution KCl.

## Utilisation

1. Ouvrez `ph.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
