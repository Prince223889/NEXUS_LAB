# Sonnette sans fil 433 MHz

Reconnaît le code d'un bouton de sonnette 433 MHz et joue une mélodie.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 24 mA (pointe 24 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Récepteur 433 MHz (RXB6 / MX-RM-5V) | VCC | 5V (VIN) |  |
| Récepteur 433 MHz (RXB6 / MX-RM-5V) | GND | GND |  |
| Récepteur 433 MHz (RXB6 / MX-RM-5V) | DATA | GPIO34 | pont diviseur si le module est alimenté en 5 V |
| Buzzer passif / haut-parleur piézo | VCC | 3V3 |  |
| Buzzer passif / haut-parleur piézo | GND | GND |  |
| Buzzer passif / haut-parleur piézo | + | GPIO4 |  |

## Bibliothèques

- **rc-switch** 2.6.4 — https://github.com/sui77/rc-switch

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rf433r_code` : Dernier code (6 chiffres)

## Utilisation

1. Ouvrez `app_sonnette_radio.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
