# Registre d'entrée 74HC165

8 entrées numériques supplémentaires avec 3 fils (chaînable) : clavier de boutons.

- **Catégorie** : Extensions d'E/S & convertisseurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Registre d'entrée 74HC165 | VCC | 3V3 |  |
| Registre d'entrée 74HC165 | GND | GND |  |
| Registre d'entrée 74HC165 | PL (1) | GPIO4 |  |
| Registre d'entrée 74HC165 | CP (2) | GPIO13 |  |
| Registre d'entrée 74HC165 | Q7 (9) | GPIO34 |  |
| Registre d'entrée 74HC165 | CE (15) | GND |  |
| Registre d'entrée 74HC165 | entrées D0-D7 | 10 kΩ vers GND + bouton vers 3V3 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sr165_inputs` : Entrées (masque)

## Utilisation

1. Ouvrez `hc165.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
