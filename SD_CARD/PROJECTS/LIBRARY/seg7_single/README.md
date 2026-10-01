# Afficheur 7 segments 1 chiffre

Afficheur à cathode commune piloté directement par 7 GPIO : compteur 0-9.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 20 mA (pointe 20 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Afficheur 7 segments 1 chiffre | VCC | 3V3 |  |
| Afficheur 7 segments 1 chiffre | GND | GND |  |
| Afficheur 7 segments 1 chiffre | segment A (via 220 Ω) | GPIO4 |  |
| Afficheur 7 segments 1 chiffre | segment B (via 220 Ω) | GPIO13 |  |
| Afficheur 7 segments 1 chiffre | segment C (via 220 Ω) | GPIO14 |  |
| Afficheur 7 segments 1 chiffre | segment D (via 220 Ω) | GPIO16 |  |
| Afficheur 7 segments 1 chiffre | segment E (via 220 Ω) | GPIO17 |  |
| Afficheur 7 segments 1 chiffre | segment F (via 220 Ω) | GPIO25 |  |
| Afficheur 7 segments 1 chiffre | segment G (via 220 Ω) | GPIO26 |  |
| Afficheur 7 segments 1 chiffre | COM | GND (cathode commune) |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Utilisation

1. Ouvrez `seg7_single.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
