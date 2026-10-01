# Arrosage automatique de plante

La pompe démarre sous 30 % d'humidité du sol et s'arrête à 40 % (sécurité 20 s max).

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 221 mA (pointe 421 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Humidité du sol capacitive v1.2 | VCC | 3V3 |  |
| Humidité du sol capacitive v1.2 | GND | GND |  |
| Humidité du sol capacitive v1.2 | AOUT | GPIO34 |  |
| Mini-pompe à eau 5 V (via MOSFET) | VCC | 5V (VIN) |  |
| Mini-pompe à eau 5 V (via MOSFET) | GND | GND |  |
| Mini-pompe à eau 5 V (via MOSFET) | grille MOSFET / IN relais | GPIO4 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `soil_moist` : Humidité du sol (%)
- `soil_mv` : Tension (mV)

## Points d'attention

- Consommation de pointe estimée 681 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Mini-pompe à eau 5 V (via MOSFET) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `app_arrosage_auto.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
