# Capteur de son KY-038 / LM393

Micro électret + comparateur : détection de bruit / claquement de mains (seuil réglable).

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | Capteur de son KY-038 / LM393 | VCC | rouge |  |
| GND | Capteur de son KY-038 / LM393 | GND | noir |  |
| GPIO35 | Capteur de son KY-038 / LM393 | DO | vert |  |
| GPIO34 | Capteur de son KY-038 / LM393 | AO | bleu |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
