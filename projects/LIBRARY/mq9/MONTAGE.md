# MQ-9 (CO, gaz inflammables)

Monoxyde de carbone et gaz inflammables (méthane, propane).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | MQ-9 (CO, gaz inflammables) | VCC | orange |  |
| GND | MQ-9 (CO, gaz inflammables) | GND | noir |  |
| GPIO34 | MQ-9 (CO, gaz inflammables) | AO | bleu | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| GPIO35 | MQ-9 (CO, gaz inflammables) | DO (seuil) | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
