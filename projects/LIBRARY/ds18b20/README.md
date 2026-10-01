# DS18B20

Sonde de température numérique 1-Wire, -55 à 125 °C (±0,5 °C), version étanche disponible.

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1.5 mA (pointe 1.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| DS18B20 | VCC | 3V3 |  |
| DS18B20 | GND | GND |  |
| DS18B20 | DATA | GPIO4 | résistance de tirage 4,7 kΩ entre DATA et 3V3 obligatoire |

## Bibliothèques

- **OneWire** 2.3.8 — https://github.com/PaulStoffregen/OneWire
- **DallasTemperature** 4.0.6 — https://github.com/milesburton/Arduino-Temperature-Control-Library

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ds18b20_temp` : Température (°C)

## Points d'attention

- Plusieurs sondes peuvent partager la même broche (adresses uniques).
- Période minimale 1000 ms en résolution 12 bits.

## Utilisation

1. Ouvrez `ds18b20.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
