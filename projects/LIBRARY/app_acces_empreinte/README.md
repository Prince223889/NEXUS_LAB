# Serrure à empreinte digitale

Une empreinte reconnue (ID ≥ 1) déverrouille la gâche 3 s.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 65 mA (pointe 660 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Lecteur d'empreintes R307 / AS608 | VCC | 3V3 |  |
| Lecteur d'empreintes R307 / AS608 | GND | GND |  |
| Lecteur d'empreintes R307 / AS608 | TX (vert) | GPIO16 |  |
| Lecteur d'empreintes R307 / AS608 | RX (blanc) | GPIO17 |  |
| Gâche / serrure électrique 12 V | VCC | 5V (VIN) |  |
| Gâche / serrure électrique 12 V | GND | GND |  |
| Gâche / serrure électrique 12 V | grille MOSFET | GPIO4 |  |
| Gâche / serrure électrique 12 V | +12 V serrure | alimentation 12 V externe | diode de roue libre en parallèle |

## Bibliothèques

- **Adafruit Fingerprint Sensor Library** 2.1.4 — https://github.com/adafruit/Adafruit-Fingerprint-Sensor-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `finger_id` : Dernier ID reconnu

## Points d'attention

- Consommation de pointe estimée 740 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Gâche / serrure électrique 12 V directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `app_acces_empreinte.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
