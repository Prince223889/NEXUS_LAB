# AD8232 (électrocardiogramme)

Frontal ECG une dérivation : visualisez le tracé cardiaque dans le traceur série.

- **Catégorie** : Santé, son & biométrie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 0.2 mA (pointe 0.2 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| AD8232 (électrocardiogramme) | VCC | 3V3 |  |
| AD8232 (électrocardiogramme) | GND | GND |  |
| AD8232 (électrocardiogramme) | OUTPUT | GPIO34 |  |
| AD8232 (électrocardiogramme) | LO+ | GPIO35 |  |
| AD8232 (électrocardiogramme) | LO- | GPIO36 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ecg_ecg` : ECG (mV)

## Points d'attention

- Jamais relié au secteur pendant la mesure (PC sur batterie ou isolation USB).
- Usage pédagogique uniquement.

## Utilisation

1. Ouvrez `ad8232.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
