# Ruban / anneau LED WS2812B (NeoPixel)

LED RVB adressables en chaîne sur un seul fil : animations, jauges, éclairage d'ambiance.

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 60 mA (pointe 480 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Ruban / anneau LED WS2812B (NeoPixel) | VCC | 5V (VIN) |  |
| Ruban / anneau LED WS2812B (NeoPixel) | GND | GND |  |
| Ruban / anneau LED WS2812B (NeoPixel) | DIN | GPIO4 | résistance 330 Ω en série, condensateur 1000 µF sur l'alimentation |

## Bibliothèques

- **Adafruit NeoPixel** 1.15.5 — https://github.com/adafruit/Adafruit_NeoPixel

## Points d'attention

- Chaque LED consomme jusqu'à 60 mA en blanc à pleine luminosité : alimentation 5 V dimensionnée en conséquence.
- Consommation de pointe estimée 560 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Ruban / anneau LED WS2812B (NeoPixel) directement en 5 V externe et reliez les masses (GND commun).
- Ruban / anneau LED WS2812B (NeoPixel) : la donnée 3,3 V fonctionne en général ; pour les longs rubans, un 74AHCT125 améliore la fiabilité.

## Utilisation

1. Ouvrez `ws2812.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
