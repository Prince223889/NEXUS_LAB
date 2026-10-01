# MPR121 (12 touches capacitives)

12 électrodes tactiles : piano en fruits, panneau de commande, jeu interactif.

- **Catégorie** : Boutons, claviers & commandes
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MPR121 (12 touches capacitives) | VCC | 3V3 |  |
| MPR121 (12 touches capacitives) | GND | GND |  |
| MPR121 (12 touches capacitives) | SDA | GPIO21 |  |
| MPR121 (12 touches capacitives) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit MPR121** 1.2.1 — https://github.com/adafruit/Adafruit_MPR121
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `mpr121_mask` : Masque des touches

## Utilisation

1. Ouvrez `mpr121.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
