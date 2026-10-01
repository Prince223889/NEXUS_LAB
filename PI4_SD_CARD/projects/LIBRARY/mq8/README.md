# MQ-8 (hydrogène)

Hydrogène 100-10 000 ppm.

- **Catégorie** : Gaz (série MQ)
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 150 mA (pointe 150 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MQ-8 (hydrogène) | VCC | 5V (VIN) |  |
| MQ-8 (hydrogène) | GND | GND |  |
| MQ-8 (hydrogène) | AO | GPIO34 | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| MQ-8 (hydrogène) | DO (seuil) | GPIO35 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mq8_ppm` : H2 (estimation) (ppm)
- `mq8_ratio` : Rs/R0
- `mq8_rsk` : Rs (kΩ)
- `mq8_alarm` : Seuil DO

## Points d'attention

- Valeurs indicatives : un étalonnage avec un gaz de référence est nécessaire pour des mesures fiables.
- La résistance chauffante consomme ~150 mA : alimentation 5 V externe conseillée pour plusieurs capteurs.
- Ne jamais utiliser comme détecteur de sécurité certifié.

## Utilisation

1. Ouvrez `mq8.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
