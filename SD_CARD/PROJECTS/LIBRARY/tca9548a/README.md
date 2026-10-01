# Multiplexeur I2C TCA9548A (8 bus)

Permet de brancher plusieurs capteurs ayant la même adresse I2C : scanne ses 8 sous-bus.

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Multiplexeur I2C TCA9548A (8 bus) | VCC | 3V3 |  |
| Multiplexeur I2C TCA9548A (8 bus) | GND | GND |  |
| Multiplexeur I2C TCA9548A (8 bus) | SDA | GPIO21 |  |
| Multiplexeur I2C TCA9548A (8 bus) | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `tca_devices` : Périphériques trouvés

## Utilisation

1. Ouvrez `tca9548a.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
