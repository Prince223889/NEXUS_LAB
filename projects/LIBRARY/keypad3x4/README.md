# Clavier matriciel 3×4 (téléphone)

Clavier matriciel 4×3 : saisie de code PIN, menu, calculatrice.

- **Catégorie** : Boutons, claviers & commandes
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Clavier matriciel 3×4 (téléphone) | VCC | 3V3 |  |
| Clavier matriciel 3×4 (téléphone) | GND | GND |  |
| Clavier matriciel 3×4 (téléphone) | ligne 1 | GPIO4 |  |
| Clavier matriciel 3×4 (téléphone) | ligne 2 | GPIO13 |  |
| Clavier matriciel 3×4 (téléphone) | ligne 3 | GPIO14 |  |
| Clavier matriciel 3×4 (téléphone) | ligne 4 | GPIO16 |  |
| Clavier matriciel 3×4 (téléphone) | colonne 1 | GPIO17 |  |
| Clavier matriciel 3×4 (téléphone) | colonne 2 | GPIO25 |  |
| Clavier matriciel 3×4 (téléphone) | colonne 3 | GPIO26 |  |

## Bibliothèques

- **Keypad** 3.1.1 — https://github.com/Chris--A/Keypad

## Utilisation

1. Ouvrez `keypad3x4.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
