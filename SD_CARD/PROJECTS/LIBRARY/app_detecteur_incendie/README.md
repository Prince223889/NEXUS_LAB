# Détecteur de flamme et fumée

Alarme dès qu'une flamme est vue par le capteur IR ; niveau de fumée MQ-2 surveillé.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 176 mA (pointe 176 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Détecteur de flamme IR (KY-026) | VCC | 3V3 |  |
| Détecteur de flamme IR (KY-026) | GND | GND |  |
| Détecteur de flamme IR (KY-026) | DO | GPIO36 |  |
| Détecteur de flamme IR (KY-026) | AO | GPIO34 |  |
| MQ-2 (fumée, GPL, butane) | VCC | 5V (VIN) |  |
| MQ-2 (fumée, GPL, butane) | GND | GND |  |
| MQ-2 (fumée, GPL, butane) | AO | GPIO35 | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| MQ-2 (fumée, GPL, butane) | DO (seuil) | GPIO39 |  |
| Buzzer actif 5 V | VCC | 3V3 |  |
| Buzzer actif 5 V | GND | GND |  |
| Buzzer actif 5 V | + (via transistor si > 20 mA) | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `flame_fire` : Flamme (0/1)
- `flame_ir` : Intensité IR (%)
- `mq2_ppm` : GPL (estimation) (ppm)
- `mq2_ratio` : Rs/R0
- `mq2_rsk` : Rs (kΩ)
- `mq2_alarm` : Seuil DO

## Utilisation

1. Ouvrez `app_detecteur_incendie.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
