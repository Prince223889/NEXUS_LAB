# Volet roulant automatique

Ouvre un store (moteur pas-à-pas) au-dessus de 2000 lx et le referme la nuit.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 241 mA (pointe 241 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| BH1750 (GY-30 / GY-302) | VCC | 3V3 |  |
| BH1750 (GY-30 / GY-302) | GND | GND |  |
| BH1750 (GY-30 / GY-302) | SDA | GPIO21 |  |
| BH1750 (GY-30 / GY-302) | SCL | GPIO22 |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | VCC | 5V (VIN) |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | GND | GND |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN1 | GPIO4 |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN2 | GPIO13 |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN3 | GPIO14 |  |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | IN4 | GPIO16 |  |

## Bibliothèques

- **BH1750** 1.3.0 — https://github.com/claws/BH1750
- **AccelStepper** 1.64 — https://github.com/waspinator/AccelStepper

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `bh1750_lux` : Éclairement (lx)

## Points d'attention

- Alimentez Moteur pas-à-pas 28BYJ-48 + ULN2003 directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `app_volet_roulant.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
