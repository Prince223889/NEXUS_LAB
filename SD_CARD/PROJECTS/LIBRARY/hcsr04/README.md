# HC-SR04 (ultrasons)

Télémètre à ultrasons 2-400 cm (résolution 3 mm), le grand classique des robots.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 15 mA (pointe 15 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HC-SR04 (ultrasons) | VCC | 5V (VIN) |  |
| HC-SR04 (ultrasons) | GND | GND |  |
| HC-SR04 (ultrasons) | TRIG | GPIO4 |  |
| HC-SR04 (ultrasons) | ECHO | GPIO34 | pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `hcsr04_dist` : Distance (cm)

## Points d'attention

- HC-SR04 (ultrasons) : la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.

## Utilisation

1. Ouvrez `hcsr04.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
