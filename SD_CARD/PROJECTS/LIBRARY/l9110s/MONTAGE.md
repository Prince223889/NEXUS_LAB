# Driver L9110S (moteur CC)

Petit double pont en H 800 mA très économique.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | Driver L9110S (moteur CC) | VCC | orange |  |
| GND | Driver L9110S (moteur CC) | GND | noir |  |
| GPIO4 | Driver L9110S (moteur CC) | A-IA | bleu |  |
| GPIO13 | Driver L9110S (moteur CC) | A-IB | vert |  |

> ⚠ Consommation de pointe estimée 1580 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
> ⚠ Alimentez Driver L9110S (moteur CC) directement en 5 V externe et reliez les masses (GND commun).

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
