# Servo à rotation continue FS90R

Servo modifié en motoréducteur : vitesse et sens de rotation (90 = arrêt).

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 10 mA (pointe 700 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Servo à rotation continue FS90R | VCC | 5V (VIN) |  |
| Servo à rotation continue FS90R | GND | GND |  |
| Servo à rotation continue FS90R | signal | GPIO4 |  |

## Bibliothèques

- **ESP32Servo** 3.2.1 — https://github.com/madhephaestus/ESP32Servo

## Points d'attention

- Consommation de pointe estimée 780 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Servo à rotation continue FS90R directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `servo_360.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
