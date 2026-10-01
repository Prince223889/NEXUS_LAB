# Sonomètre lumineux

Le ruban LED passe du vert au rouge selon le niveau sonore (cantine, open-space).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Microphone MAX4466 / MAX9814 | VCC | rouge |  |
| GND | Microphone MAX4466 / MAX9814 | GND | noir |  |
| GPIO34 | Microphone MAX4466 / MAX9814 | OUT | vert |  |
| 5V (VIN) | Ruban / anneau LED WS2812B (NeoPixel) | VCC | orange |  |
| GND | Ruban / anneau LED WS2812B (NeoPixel) | GND | noir |  |
| GPIO4 | Ruban / anneau LED WS2812B (NeoPixel) | DIN | bleu | résistance 330 Ω en série, condensateur 1000 µF sur l'alimentation |

> ⚠ Consommation de pointe estimée 561 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
> ⚠ Alimentez Ruban / anneau LED WS2812B (NeoPixel) directement en 5 V externe et reliez les masses (GND commun).
> ⚠ Ruban / anneau LED WS2812B (NeoPixel) : la donnée 3,3 V fonctionne en général ; pour les longs rubans, un 74AHCT125 améliore la fiabilité.

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
