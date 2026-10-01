# SenseAir S8 (CO₂ NDIR)

Capteur CO₂ industriel 400-2000 ppm (±40 ppm), protocole Modbus RTU.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 30 mA (pointe 300 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SenseAir S8 (CO₂ NDIR) | VCC | 5V (VIN) |  |
| SenseAir S8 (CO₂ NDIR) | GND | GND |  |
| SenseAir S8 (CO₂ NDIR) | UART_TxD | GPIO16 |  |
| SenseAir S8 (CO₂ NDIR) | UART_RxD | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `s8_co2` : CO₂ (ppm)

## Points d'attention

- Alimentez SenseAir S8 (CO₂ NDIR) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `senseair_s8.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
