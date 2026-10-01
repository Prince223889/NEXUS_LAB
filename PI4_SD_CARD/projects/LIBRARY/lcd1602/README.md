# Écran LCD 16×2 + module I2C

L'écran à cristaux liquides le plus répandu, piloté par 2 fils grâce au module PCF8574.

- **Catégorie** : Afficheurs
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 30 mA (pointe 30 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Écran LCD 16×2 + module I2C | VCC | 5V (VIN) |  |
| Écran LCD 16×2 + module I2C | GND | GND |  |
| Écran LCD 16×2 + module I2C | SDA | GPIO21 |  |
| Écran LCD 16×2 + module I2C | SCL | GPIO22 |  |

## Bibliothèques

- **LiquidCrystal I2C** 1.1.2 — https://github.com/johnrickman/LiquidCrystal_I2C

## Points d'attention

- Réglez le contraste avec le potentiomètre bleu au dos du module.
- Le module est alimenté en 5 V ; ses lignes I2C tirées au 5 V sont en pratique tolérées, sinon utilisez un convertisseur de niveau.

## Utilisation

1. Ouvrez `lcd1602.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
