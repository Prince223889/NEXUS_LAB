# SCD40 / SCD41 (CO₂ photoacoustique)

Capteur CO₂ miniature Sensirion (400-5000 ppm), piloté directement par commandes I2C.

- **Catégorie** : Qualité de l'air & CO₂
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 15 mA (pointe 205 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SCD40 / SCD41 (CO₂ photoacoustique) | VCC | 3V3 |  |
| SCD40 / SCD41 (CO₂ photoacoustique) | GND | GND |  |
| SCD40 / SCD41 (CO₂ photoacoustique) | SDA | GPIO21 |  |
| SCD40 / SCD41 (CO₂ photoacoustique) | SCL | GPIO22 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `scd40_co2` : CO₂ (ppm)
- `scd40_temp` : Température (°C)
- `scd40_hum` : Humidité (%)

## Points d'attention

- Auto-étalonnage : exposez le capteur à l'air extérieur au moins 1 h par semaine.

## Utilisation

1. Ouvrez `scd40.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
