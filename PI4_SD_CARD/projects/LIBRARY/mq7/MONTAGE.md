# MQ-7 (monoxyde de carbone)

Monoxyde de carbone 20-2000 ppm (cycle de chauffe 5 V / 1,4 V idéalement).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | MQ-7 (monoxyde de carbone) | VCC | orange |  |
| GND | MQ-7 (monoxyde de carbone) | GND | noir |  |
| GPIO34 | MQ-7 (monoxyde de carbone) | AO | bleu | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| GPIO35 | MQ-7 (monoxyde de carbone) | DO (seuil) | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
