# Éclairage à intensité automatique

Une LED/ruban compense la lumière ambiante : plus il fait sombre, plus elle éclaire.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 11 mA (pointe 11 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Photorésistance (LDR / GL5528) | VCC | 3V3 |  |
| Photorésistance (LDR / GL5528) | GND | GND |  |
| Photorésistance (LDR / GL5528) | point milieu | GPIO34 | LDR entre 3V3 et le point milieu, 10 kΩ entre le point milieu et GND |
| LED à intensité variable (PWM) | VCC | 3V3 |  |
| LED à intensité variable (PWM) | GND | GND |  |
| LED à intensité variable (PWM) | anode via 220 Ω | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ldr_light` : Luminosité (%)

## Utilisation

1. Ouvrez `app_variateur_auto.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
