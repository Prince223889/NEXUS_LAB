# Ventilateur PC 4 fils (PWM 25 kHz)

Ventilateur 12 V 4 broches : vitesse par PWM 25 kHz et lecture des tours/minute.

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Ventilateur PC 4 fils (PWM 25 kHz) | VCC | 5V (VIN) |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | GND | GND |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | PWM (bleu) | GPIO13 |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | TACH (vert) | GPIO4 |  |
| Ventilateur PC 4 fils (PWM 25 kHz) | +12 V (jaune) | alimentation 12 V externe | GND commun avec l'ESP32 |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `fan_rpm` : Vitesse (tr/min)
- `fan_duty` : Consigne (%)

## Utilisation

1. Ouvrez `fan_pwm.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
