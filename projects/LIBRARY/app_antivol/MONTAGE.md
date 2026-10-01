# Antivol à vibration (vélo, sac)

Toute secousse déclenche le buzzer.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Capteur de vibration SW-420 | VCC | rouge |  |
| GND | Capteur de vibration SW-420 | GND | noir |  |
| GPIO34 | Capteur de vibration SW-420 | DO | vert |  |
| 3V3 | Buzzer actif 5 V | VCC | rouge |  |
| GND | Buzzer actif 5 V | GND | noir |  |
| GPIO4 | Buzzer actif 5 V | + (via transistor si > 20 mA) | bleu |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
