# Servomoteur SG90 / MG90S

Servomoteur 0-180° piloté en PWM 50 Hz (bibliothèque ESP32Servo).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | Servomoteur SG90 / MG90S | VCC | orange |  |
| GND | Servomoteur SG90 / MG90S | GND | noir |  |
| GPIO4 | Servomoteur SG90 / MG90S | signal (orange) | bleu |  |

> ⚠ Consommation de pointe estimée 730 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
> ⚠ Alimentez Servomoteur SG90 / MG90S directement en 5 V externe et reliez les masses (GND commun).

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
