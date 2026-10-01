# Détecteur de fuite de gaz

Alarme sonore et coupure d'une électrovanne (relais) au-delà d'un seuil de gaz (démonstration pédagogique).

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 245 mA (pointe 245 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MQ-2 (fumée, GPL, butane) | VCC | 5V (VIN) |  |
| MQ-2 (fumée, GPL, butane) | GND | GND |  |
| MQ-2 (fumée, GPL, butane) | AO | GPIO34 | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| MQ-2 (fumée, GPL, butane) | DO (seuil) | GPIO35 |  |
| Buzzer actif 5 V | VCC | 3V3 |  |
| Buzzer actif 5 V | GND | GND |  |
| Buzzer actif 5 V | + (via transistor si > 20 mA) | GPIO4 |  |
| Module relais 5 V (1 canal) | VCC | 5V (VIN) |  |
| Module relais 5 V (1 canal) | GND | GND |  |
| Module relais 5 V (1 canal) | IN | GPIO13 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mq2_ppm` : GPL (estimation) (ppm)
- `mq2_ratio` : Rs/R0
- `mq2_rsk` : Rs (kΩ)
- `mq2_alarm` : Seuil DO

## Points d'attention

- Pédagogique : ne remplace pas un détecteur certifié NF.

## Utilisation

1. Ouvrez `app_fuite_gaz.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
