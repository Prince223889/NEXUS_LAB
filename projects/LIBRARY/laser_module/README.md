# Module laser KY-008 (650 nm)

Diode laser rouge 5 mW commandée par une broche (clignotement de démonstration).

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Module laser KY-008 (650 nm) | VCC | 3V3 |  |
| Module laser KY-008 (650 nm) | GND | GND |  |
| Module laser KY-008 (650 nm) | S | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Points d'attention

- Ne jamais diriger le faisceau vers les yeux.

## Utilisation

1. Ouvrez `laser_module.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
