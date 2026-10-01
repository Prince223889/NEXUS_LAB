# Capteur Hall linéaire SS49E (KY-035)

Sortie analogique proportionnelle au champ magnétique (±1000 G, 1,4 mV/G).

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Capteur Hall linéaire SS49E (KY-035) | VCC | 3V3 |  |
| Capteur Hall linéaire SS49E (KY-035) | GND | GND |  |
| Capteur Hall linéaire SS49E (KY-035) | S | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `hall49e_field` : Champ (G)

## Utilisation

1. Ouvrez `hall_49e.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
