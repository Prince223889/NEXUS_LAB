# Horloge temps réel PCF8563

Horloge basse consommation NXP, présente sur de nombreuses cartes ESP32.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Horloge temps réel PCF8563 | VCC | rouge |  |
| GND | Horloge temps réel PCF8563 | GND | noir |  |
| GPIO21 | Horloge temps réel PCF8563 | SDA | bleu |  |
| GPIO22 | Horloge temps réel PCF8563 | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
