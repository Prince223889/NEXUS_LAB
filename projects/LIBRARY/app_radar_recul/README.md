# Radar de recul sonore

Plus l'obstacle est proche, plus le bip est aigu ; distance sur afficheur 4 chiffres.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 55 mA (pointe 55 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HC-SR04 (ultrasons) | VCC | 5V (VIN) |  |
| HC-SR04 (ultrasons) | GND | GND |  |
| HC-SR04 (ultrasons) | TRIG | GPIO13 |  |
| HC-SR04 (ultrasons) | ECHO | GPIO34 | pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V |
| Buzzer passif / haut-parleur piézo | VCC | 3V3 |  |
| Buzzer passif / haut-parleur piézo | GND | GND |  |
| Buzzer passif / haut-parleur piézo | + | GPIO4 |  |
| Afficheur 4 chiffres TM1637 | VCC | 3V3 |  |
| Afficheur 4 chiffres TM1637 | GND | GND |  |
| Afficheur 4 chiffres TM1637 | CLK | GPIO14 |  |
| Afficheur 4 chiffres TM1637 | DIO | GPIO16 |  |

## Bibliothèques

- **TM1637** 1.2.0 — https://github.com/avishorp/TM1637

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `hcsr04_dist` : Distance (cm)

## Points d'attention

- HC-SR04 (ultrasons) : la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.

## Utilisation

1. Ouvrez `app_radar_recul.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
