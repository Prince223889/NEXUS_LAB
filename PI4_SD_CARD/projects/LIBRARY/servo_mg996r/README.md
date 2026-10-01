# Servomoteur MG996R (couple 10 kg·cm)

Servo à pignons métal pour bras robotisés et mécanismes lourds.

- **Catégorie** : Moteurs & servos
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 10 mA (pointe 2500 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Servomoteur MG996R (couple 10 kg·cm) | VCC | 5V (VIN) |  |
| Servomoteur MG996R (couple 10 kg·cm) | GND | GND |  |
| Servomoteur MG996R (couple 10 kg·cm) | signal (orange) | GPIO4 |  |

## Bibliothèques

- **ESP32Servo** 3.2.1 — https://github.com/madhephaestus/ESP32Servo

## Points d'attention

- Courant de blocage 2,5 A : alimentation 5-6 V / 3 A dédiée obligatoire.
- Consommation de pointe estimée 2580 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Servomoteur MG996R (couple 10 kg·cm) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `servo_mg996r.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
