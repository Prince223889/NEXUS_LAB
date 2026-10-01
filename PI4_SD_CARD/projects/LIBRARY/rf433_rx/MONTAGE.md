# Récepteur 433 MHz (RXB6 / MX-RM-5V)

Décode les télécommandes 433 MHz (prises radiocommandées, sonnettes, capteurs d'ouverture).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | Récepteur 433 MHz (RXB6 / MX-RM-5V) | VCC | orange |  |
| GND | Récepteur 433 MHz (RXB6 / MX-RM-5V) | GND | noir |  |
| GPIO34 | Récepteur 433 MHz (RXB6 / MX-RM-5V) | DATA | bleu | pont diviseur si le module est alimenté en 5 V |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
