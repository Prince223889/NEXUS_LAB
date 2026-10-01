# Driver DRV8833 (moteur CC)

Double pont en H basse tension (2,7-10,8 V), commande par deux PWM.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | Driver DRV8833 (moteur CC) | VCC | orange |  |
| GND | Driver DRV8833 (moteur CC) | GND | noir |  |
| GPIO4 | Driver DRV8833 (moteur CC) | IN1 | bleu |  |
| GPIO13 | Driver DRV8833 (moteur CC) | IN2 | vert |  |

> ⚠ Consommation de pointe estimée 1580 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
> ⚠ Alimentez Driver DRV8833 (moteur CC) directement en 5 V externe et reliez les masses (GND commun).

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
