# Contrôle d'accès par badge RFID

Le badge autorisé ouvre la gâche électrique pendant 3 s ; une LED signale l'accès.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 41 mA (pointe 636 mA) + carte ESP32

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
| Gâche / serrure électrique 12 V | VCC | 5V (VIN) |  |
| Gâche / serrure électrique 12 V | GND | GND |  |
| Gâche / serrure électrique 12 V | grille MOSFET | GPIO14 |  |
| Gâche / serrure électrique 12 V | +12 V serrure | alimentation 12 V externe | diode de roue libre en parallèle |
| LED + résistance 220 Ω | VCC | 3V3 |  |
| LED + résistance 220 Ω | GND | GND |  |
| LED + résistance 220 Ω | anode (+) via 220 Ω | GPIO16 | cathode (patte courte) vers GND |

## Bibliothèques

- **MFRC522** 1.4.12 — https://github.com/miguelbalboa/rfid

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rfid_granted` : Dernier accès (0/1)
- `rfid_reads` : Lectures

## Points d'attention

- Consommation de pointe estimée 716 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Gâche / serrure électrique 12 V directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `app_acces_rfid.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
