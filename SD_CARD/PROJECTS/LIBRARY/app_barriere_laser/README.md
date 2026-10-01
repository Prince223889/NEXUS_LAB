# Barrière laser d'alarme

Un faisceau laser traverse la pièce ; s'il est coupé, la sirène retentit.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 56 mA (pointe 56 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Module laser KY-008 (650 nm) | VCC | 3V3 |  |
| Module laser KY-008 (650 nm) | GND | GND |  |
| Module laser KY-008 (650 nm) | S | GPIO4 |  |
| Récepteur laser (module ISO203) | VCC | 3V3 |  |
| Récepteur laser (module ISO203) | GND | GND |  |
| Récepteur laser (module ISO203) | OUT | GPIO34 |  |
| Buzzer actif 5 V | VCC | 3V3 |  |
| Buzzer actif 5 V | GND | GND |  |
| Buzzer actif 5 V | + (via transistor si > 20 mA) | GPIO13 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `laserrx_beam` : Faisceau reçu (0/1)

## Utilisation

1. Ouvrez `app_barriere_laser.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
