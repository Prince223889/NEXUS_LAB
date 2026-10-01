# MQ-3 (alcool)

Détecteur de vapeur d'alcool pour éthylotest pédagogique (0,05-10 mg/L).

- **Catégorie** : Gaz (série MQ)
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 160 mA (pointe 160 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MQ-3 (alcool) | VCC | 5V (VIN) |  |
| MQ-3 (alcool) | GND | GND |  |
| MQ-3 (alcool) | AO | GPIO34 | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| MQ-3 (alcool) | DO (seuil) | GPIO35 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mq3_ppm` : Alcool (estimation) (mg/L)
- `mq3_ratio` : Rs/R0
- `mq3_rsk` : Rs (kΩ)
- `mq3_alarm` : Seuil DO

## Points d'attention

- Valeurs indicatives : un étalonnage avec un gaz de référence est nécessaire pour des mesures fiables.
- La résistance chauffante consomme ~150 mA : alimentation 5 V externe conseillée pour plusieurs capteurs.
- Ne jamais utiliser comme détecteur de sécurité certifié.

## Utilisation

1. Ouvrez `mq3.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
