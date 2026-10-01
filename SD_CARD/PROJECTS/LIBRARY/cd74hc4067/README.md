# Multiplexeur analogique CD74HC4067 (16 voies)

Lit 16 capteurs analogiques sur une seule entrée ADC grâce à 4 lignes de sélection.

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Multiplexeur analogique CD74HC4067 (16 voies) | VCC | 3V3 |  |
| Multiplexeur analogique CD74HC4067 (16 voies) | GND | GND |  |
| Multiplexeur analogique CD74HC4067 (16 voies) | S0 | GPIO4 |  |
| Multiplexeur analogique CD74HC4067 (16 voies) | S1 | GPIO13 |  |
| Multiplexeur analogique CD74HC4067 (16 voies) | S2 | GPIO14 |  |
| Multiplexeur analogique CD74HC4067 (16 voies) | S3 | GPIO16 |  |
| Multiplexeur analogique CD74HC4067 (16 voies) | SIG | GPIO34 |  |
| Multiplexeur analogique CD74HC4067 (16 voies) | EN | GND |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mux_c0` : Voie 0 (mV)
- `mux_c1` : Voie 1 (mV)
- `mux_c2` : Voie 2 (mV)
- `mux_c3` : Voie 3 (mV)

## Utilisation

1. Ouvrez `cd74hc4067.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
