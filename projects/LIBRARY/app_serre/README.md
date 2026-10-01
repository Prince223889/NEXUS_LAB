# Serre intelligente

Aération au-dessus de 28 °C, arrosage sous 35 % d'humidité du sol, suivi de la lumière ; tableau de bord web.

- **Catégorie** : Projets complets
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 273 mA (pointe 473 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| SHT31 | VCC | 3V3 |  |
| SHT31 | GND | GND |  |
| SHT31 | SDA | GPIO21 |  |
| SHT31 | SCL | GPIO22 |  |
| Humidité du sol capacitive v1.2 | VCC | 3V3 |  |
| Humidité du sol capacitive v1.2 | GND | GND |  |
| Humidité du sol capacitive v1.2 | AOUT | GPIO34 |  |
| BH1750 (GY-30 / GY-302) | VCC | 3V3 |  |
| BH1750 (GY-30 / GY-302) | GND | GND |  |
| BH1750 (GY-30 / GY-302) | SDA | GPIO21 |  |
| BH1750 (GY-30 / GY-302) | SCL | GPIO22 |  |
| Module relais 5 V (1 canal) | VCC | 5V (VIN) |  |
| Module relais 5 V (1 canal) | GND | GND |  |
| Module relais 5 V (1 canal) | IN | GPIO4 |  |
| Mini-pompe à eau 5 V (via MOSFET) | VCC | 5V (VIN) |  |
| Mini-pompe à eau 5 V (via MOSFET) | GND | GND |  |
| Mini-pompe à eau 5 V (via MOSFET) | grille MOSFET / IN relais | GPIO13 |  |

## Bibliothèques

- **Adafruit SHT31 Library** 2.2.2 — https://github.com/adafruit/Adafruit_SHT31
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO
- **BH1750** 1.3.0 — https://github.com/claws/BH1750

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `sht31_temp` : Température (°C)
- `sht31_hum` : Humidité (%)
- `soil_moist` : Humidité du sol (%)
- `soil_mv` : Tension (mV)
- `bh1750_lux` : Éclairement (lx)

## Points d'attention

- Consommation de pointe estimée 733 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).
- Alimentez Mini-pompe à eau 5 V (via MOSFET) directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `app_serre.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
