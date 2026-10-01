# JSN-SR04T (ultrasons étanche)

Version étanche à sonde déportée, 25-450 cm : niveau de cuve, parking.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 5V (VIN) | JSN-SR04T (ultrasons étanche) | VCC | orange |  |
| GND | JSN-SR04T (ultrasons étanche) | GND | noir |  |
| GPIO4 | JSN-SR04T (ultrasons étanche) | TRIG | bleu |  |
| GPIO34 | JSN-SR04T (ultrasons étanche) | ECHO | vert | pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V |

> ⚠ JSN-SR04T (ultrasons étanche) : la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
