# Robot éviteur d'obstacles

Le moteur recule quand un obstacle est à moins de 20 cm, avance sinon (base de robot mobile).

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 25 mA (pointe 1515 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HC-SR04 (ultrasons) | VCC | 5V (VIN) |  |
| HC-SR04 (ultrasons) | GND | GND |  |
| HC-SR04 (ultrasons) | TRIG | GPIO13 |  |
| HC-SR04 (ultrasons) | ECHO | GPIO34 | pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V |
| Pont en H L298N (moteur CC) | VCC | 5V (VIN) |  |
| Pont en H L298N (moteur CC) | GND | GND |  |
| Pont en H L298N (moteur CC) | ENA (retirer le cavalier) | GPIO4 |  |
| Pont en H L298N (moteur CC) | IN1 | GPIO14 |  |
| Pont en H L298N (moteur CC) | IN2 | GPIO16 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `hcsr04_dist` : Distance (cm)

## Points d'attention

- Consommation de pointe estimée 1595 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Pont en H L298N (moteur CC) directement en 5 V externe et reliez les masses (GND commun).
- HC-SR04 (ultrasons) : la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.

## Utilisation

1. Ouvrez `app_robot_evitement.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
