# Alarme anti-intrusion

Détecteur de mouvement PIR + contact de porte : sirène et voyant.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 36.1 mA (pointe 36.1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HC-SR501 (PIR infrarouge passif) | VCC | 5V (VIN) |  |
| HC-SR501 (PIR infrarouge passif) | GND | GND |  |
| HC-SR501 (PIR infrarouge passif) | OUT | GPIO34 |  |
| Contact reed (ILS) | VCC | 3V3 |  |
| Contact reed (ILS) | GND | GND |  |
| Contact reed (ILS) | signal | GPIO4 | l'autre borne vers GND |
| Buzzer actif 5 V | VCC | 3V3 |  |
| Buzzer actif 5 V | GND | GND |  |
| Buzzer actif 5 V | + (via transistor si > 20 mA) | GPIO13 |  |
| LED + résistance 220 Ω | VCC | 3V3 |  |
| LED + résistance 220 Ω | GND | GND |  |
| LED + résistance 220 Ω | anode (+) via 220 Ω | GPIO14 | cathode (patte courte) vers GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pir_hcsr501_motion` : Présence (0/1)
- `porte_state` : État (0/1)
- `porte_count` : Déclenchements

## Utilisation

1. Ouvrez `app_alarme_intrusion.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
