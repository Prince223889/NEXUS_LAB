# Clavier matriciel 4×4

Clavier matriciel 4×4 : saisie de code PIN, menu, calculatrice.

- **Catégorie** : Boutons, claviers & commandes
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Clavier matriciel 4×4 | VCC | 3V3 |  |
| Clavier matriciel 4×4 | GND | GND |  |
| Clavier matriciel 4×4 | ligne 1 | GPIO4 |  |
| Clavier matriciel 4×4 | ligne 2 | GPIO13 |  |
| Clavier matriciel 4×4 | ligne 3 | GPIO14 |  |
| Clavier matriciel 4×4 | ligne 4 | GPIO16 |  |
| Clavier matriciel 4×4 | colonne 1 | GPIO17 |  |
| Clavier matriciel 4×4 | colonne 2 | GPIO25 |  |
| Clavier matriciel 4×4 | colonne 3 | GPIO26 |  |
| Clavier matriciel 4×4 | colonne 4 | GPIO27 |  |

## Bibliothèques

- **Keypad** 3.1.1 — https://github.com/Chris--A/Keypad

## Utilisation

1. Ouvrez `keypad4x4.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
