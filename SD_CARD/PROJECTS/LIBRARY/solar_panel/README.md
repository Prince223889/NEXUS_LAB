# Petit panneau solaire (tension/puissance)

Mesure la tension d'un panneau 6 V sur charge résistive pour estimer l'ensoleillement.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Petit panneau solaire (tension/puissance) | VCC | 3V3 |  |
| Petit panneau solaire (tension/puissance) | GND | GND |  |
| Petit panneau solaire (tension/puissance) | point milieu | GPIO34 | pont 10 kΩ / 10 kΩ, charge 47 Ω en parallèle du panneau |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `solar_volt` : Tension (V)
- `solar_power` : Puissance (mW)

## Utilisation

1. Ouvrez `solar_panel.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
