# MQ-5 (GPL, gaz de ville)

Détecte GPL et gaz naturel, peu sensible à l'alcool et à la fumée.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | MQ-5 (GPL, gaz de ville) | VCC | orange |  |
| GND | MQ-5 (GPL, gaz de ville) | GND | noir |  |
| GPIO34 | MQ-5 (GPL, gaz de ville) | AO | bleu | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| GPIO35 | MQ-5 (GPL, gaz de ville) | DO (seuil) | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
