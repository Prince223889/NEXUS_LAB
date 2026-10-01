# MPU-6050 (GY-521)

Centrale inertielle 6 axes : accéléromètre ±2-16 g et gyroscope ±250-2000 °/s.

**Carte :** ESP32 DevKit V1 (WROOM-32) — moniteur série 115200 bauds.

![Montage](montage.svg)

| ESP32 | Composant | Broche | Couleur fil | Remarque |
|---|---|---|---|---|
| 3V3 | MPU-6050 (GY-521) | VCC | rouge |  |
| GND | MPU-6050 (GY-521) | GND | noir |  |
| GPIO21 | MPU-6050 (GY-521) | SDA | bleu |  |
| GPIO22 | MPU-6050 (GY-521) | SCL | vert |  |

Toujours câbler **carte débranchée**. Masse (GND) commune entre tous les modules.
