# HC-SR501 (PIR infrarouge passif)

Détecteur de mouvement pyroélectrique 7 m / 120°, temporisation et sensibilité réglables.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 0.1 mA (pointe 0.1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| HC-SR501 (PIR infrarouge passif) | VCC | 5V (VIN) |  |
| HC-SR501 (PIR infrarouge passif) | GND | GND |  |
| HC-SR501 (PIR infrarouge passif) | OUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pir_hcsr501_motion` : Présence (0/1)

## Points d'attention

- Laissez 60 s de stabilisation après la mise sous tension.
- Sortie 3,3 V : compatible directement.

## Utilisation

1. Ouvrez `pir_hcsr501.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
