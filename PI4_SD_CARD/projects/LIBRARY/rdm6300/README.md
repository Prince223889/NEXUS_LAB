# Lecteur RFID 125 kHz RDM6300

Lit les badges 125 kHz EM4100 (portes d'immeuble) : trame ASCII à 9600 bauds.

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 50 mA (pointe 50 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Lecteur RFID 125 kHz RDM6300 | VCC | 5V (VIN) |  |
| Lecteur RFID 125 kHz RDM6300 | GND | GND |  |
| Lecteur RFID 125 kHz RDM6300 | TX du module | GPIO16 |  |
| Lecteur RFID 125 kHz RDM6300 | RX (non utilisé) | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rdm6300_last` : Badge (5 derniers chiffres)

## Utilisation

1. Ouvrez `rdm6300.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
