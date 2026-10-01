# Indicateur CO₂ « feu tricolore » (salle de classe)

Un anneau LED passe du vert (400 ppm) au rouge (1500 ppm) : signal clair pour aérer.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 95 mA (pointe 705 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SCD40 / SCD41 (CO₂ photoacoustique) | VCC | 3V3 |  |
| SCD40 / SCD41 (CO₂ photoacoustique) | GND | GND |  |
| SCD40 / SCD41 (CO₂ photoacoustique) | SDA | GPIO21 |  |
| SCD40 / SCD41 (CO₂ photoacoustique) | SCL | GPIO22 |  |
| Ruban / anneau LED WS2812B (NeoPixel) | VCC | 5V (VIN) |  |
| Ruban / anneau LED WS2812B (NeoPixel) | GND | GND |  |
| Ruban / anneau LED WS2812B (NeoPixel) | DIN | GPIO4 | résistance 330 Ω en série, condensateur 1000 µF sur l'alimentation |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | VCC | 3V3 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | GND | GND |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SDA | GPIO21 |  |
| Écran OLED 0,96" SSD1306 128×64 (I2C) | SCL | GPIO22 |  |

## Bibliothèques

- **Adafruit NeoPixel** 1.15.5 — https://github.com/adafruit/Adafruit_NeoPixel
- **Adafruit SSD1306** 2.5.17 — https://github.com/adafruit/Adafruit_SSD1306
- **Adafruit GFX Library** 1.12.6 — https://github.com/adafruit/Adafruit-GFX-Library
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `scd40_co2` : CO₂ (ppm)
- `scd40_temp` : Température (°C)
- `scd40_hum` : Humidité (%)

## Points d'attention

- Consommation de pointe estimée 965 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Ruban / anneau LED WS2812B (NeoPixel) directement en 5 V externe et reliez les masses (GND commun).
- Ruban / anneau LED WS2812B (NeoPixel) : la donnée 3,3 V fonctionne en général ; pour les longs rubans, un 74AHCT125 améliore la fiabilité.

## Utilisation

1. Ouvrez `app_co2_feu.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
