# Lecteur RFID RC522 (13,56 MHz)

Lit l'identifiant (UID) des badges et cartes MIFARE : contrôle d'accès, pointeuse.

- **Catégorie** : Identification, temps & position
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 26 mA (pointe 26 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Lecteur RFID RC522 (13,56 MHz) | VCC | 3V3 |  |
| Lecteur RFID RC522 (13,56 MHz) | GND | GND |  |
| Lecteur RFID RC522 (13,56 MHz) | SCK | GPIO18 |  |
| Lecteur RFID RC522 (13,56 MHz) | MISO | GPIO19 |  |
| Lecteur RFID RC522 (13,56 MHz) | MOSI | GPIO23 |  |
| Lecteur RFID RC522 (13,56 MHz) | SDA (SS) | GPIO4 |  |
| Lecteur RFID RC522 (13,56 MHz) | RST | GPIO13 |  |

## Bibliothèques

- **MFRC522** 1.4.12 — https://github.com/miguelbalboa/rfid

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rfid_granted` : Dernier accès (0/1)
- `rfid_reads` : Lectures

## Points d'attention

- Le RC522 fonctionne en 3,3 V uniquement.
- Remplacez « allowed » par l'UID affiché de votre badge.

## Utilisation

1. Ouvrez `rc522.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
