# Lecteur d'empreintes R307 / AS608

Reconnaissance d'empreintes digitales (jusqu'à 162 modèles) pour serrure ou pointeuse.

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 60 mA (pointe 60 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Lecteur d'empreintes R307 / AS608 | VCC | 3V3 |  |
| Lecteur d'empreintes R307 / AS608 | GND | GND |  |
| Lecteur d'empreintes R307 / AS608 | TX (vert) | GPIO16 |  |
| Lecteur d'empreintes R307 / AS608 | RX (blanc) | GPIO17 |  |

## Bibliothèques

- **Adafruit Fingerprint Sensor Library** 2.1.4 — https://github.com/adafruit/Adafruit-Fingerprint-Sensor-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `finger_id` : Dernier ID reconnu

## Points d'attention

- Enregistrez les empreintes avec l'exemple « enroll » de la bibliothèque Adafruit.

## Utilisation

1. Ouvrez `fingerprint.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
