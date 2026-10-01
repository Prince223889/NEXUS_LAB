# Bus RS485 MAX485 (Modbus RTU)

Interroge un appareil Modbus RTU (compteur, variateur, sonde) : lecture de registres.

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Bus RS485 MAX485 (Modbus RTU) | VCC | 5V (VIN) |  |
| Bus RS485 MAX485 (Modbus RTU) | GND | GND |  |
| Bus RS485 MAX485 (Modbus RTU) | RO | GPIO16 |  |
| Bus RS485 MAX485 (Modbus RTU) | DI | GPIO17 |  |
| Bus RS485 MAX485 (Modbus RTU) | DE + RE (reliées) | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rs485_value` : Registre

## Points d'attention

- Résistance de terminaison 120 Ω aux deux extrémités du bus.
- Modules MAX485 5 V : RO sort du 5 V → pont diviseur ou version MAX3485 3,3 V.

## Utilisation

1. Ouvrez `rs485.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
