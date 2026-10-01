# Récepteur 433 MHz (RXB6 / MX-RM-5V)

Décode les télécommandes 433 MHz (prises radiocommandées, sonnettes, capteurs d'ouverture).

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 4 mA (pointe 4 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Récepteur 433 MHz (RXB6 / MX-RM-5V) | VCC | 5V (VIN) |  |
| Récepteur 433 MHz (RXB6 / MX-RM-5V) | GND | GND |  |
| Récepteur 433 MHz (RXB6 / MX-RM-5V) | DATA | GPIO34 | pont diviseur si le module est alimenté en 5 V |

## Bibliothèques

- **rc-switch** 2.6.4 — https://github.com/sui77/rc-switch

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `rf433r_code` : Dernier code (6 chiffres)

## Points d'attention

- Antenne : fil rigide de 17,3 cm soudé sur ANT.

## Utilisation

1. Ouvrez `rf433_rx.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
