# MQ-8 (hydrogène)

Hydrogène 100-10 000 ppm.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | MQ-8 (hydrogène) | VCC | orange |  |
| GND | MQ-8 (hydrogène) | GND | noir |  |
| GPIO34 | MQ-8 (hydrogène) | AO | bleu | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| GPIO35 | MQ-8 (hydrogène) | DO (seuil) | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
