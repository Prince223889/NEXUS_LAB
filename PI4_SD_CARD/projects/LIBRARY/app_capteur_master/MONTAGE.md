# Capteur connecté au tableau de bord du MASTER

Rejoint le Wi-Fi « ESP32-LAB » et envoie ses mesures au MASTER (onglet Capteurs).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | SHT40 / SHT41 / SHT45 | VCC | rouge |  |
| GND | SHT40 / SHT41 / SHT45 | GND | noir |  |
| GPIO21 | SHT40 / SHT41 / SHT45 | SDA | bleu |  |
| GPIO22 | SHT40 / SHT41 / SHT45 | SCL | vert |  |
| 3V3 | BH1750 (GY-30 / GY-302) | VCC | rouge |  |
| GND | BH1750 (GY-30 / GY-302) | GND | noir |  |
| GPIO21 | BH1750 (GY-30 / GY-302) | SDA | bleu |  |
| GPIO22 | BH1750 (GY-30 / GY-302) | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
