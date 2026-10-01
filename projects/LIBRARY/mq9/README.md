# MQ-9 (CO, gaz inflammables)

Monoxyde de carbone et gaz inflammables (méthane, propane).

- **Catégorie** : Gaz (série MQ)
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 150 mA (pointe 150 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MQ-9 (CO, gaz inflammables) | VCC | 5V (VIN) |  |
| MQ-9 (CO, gaz inflammables) | GND | GND |  |
| MQ-9 (CO, gaz inflammables) | AO | GPIO34 | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| MQ-9 (CO, gaz inflammables) | DO (seuil) | GPIO35 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mq9_ppm` : CO (estimation) (ppm)
- `mq9_ratio` : Rs/R0
- `mq9_rsk` : Rs (kΩ)
- `mq9_alarm` : Seuil DO

## Points d'attention

- Valeurs indicatives : un étalonnage avec un gaz de référence est nécessaire pour des mesures fiables.
- La résistance chauffante consomme ~150 mA : alimentation 5 V externe conseillée pour plusieurs capteurs.
- Ne jamais utiliser comme détecteur de sécurité certifié.

## Utilisation

1. Ouvrez `mq9.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
