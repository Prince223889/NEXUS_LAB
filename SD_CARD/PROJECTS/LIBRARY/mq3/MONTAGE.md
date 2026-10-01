# MQ-3 (alcool)

Détecteur de vapeur d'alcool pour éthylotest pédagogique (0,05-10 mg/L).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | MQ-3 (alcool) | VCC | orange |  |
| GND | MQ-3 (alcool) | GND | noir |  |
| GPIO34 | MQ-3 (alcool) | AO | bleu | via pont diviseur 10 kΩ / 20 kΩ : la sortie monte à 5 V |
| GPIO35 | MQ-3 (alcool) | DO (seuil) | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
