# MAX31865 + sonde PT100

Convertisseur pour sondes platine PT100/PT1000 (2, 3 ou 4 fils).

- **Catégorie** : Température, humidité & pression
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| MAX31865 + sonde PT100 | VCC | 3V3 |  |
| MAX31865 + sonde PT100 | GND | GND |  |
| MAX31865 + sonde PT100 | SCK | GPIO18 |  |
| MAX31865 + sonde PT100 | SO/MISO | GPIO19 |  |
| MAX31865 + sonde PT100 | SDI/MOSI | GPIO23 |  |
| MAX31865 + sonde PT100 | CS | GPIO4 |  |

## Bibliothèques

- **Adafruit MAX31865 library** 1.6.2 — https://github.com/adafruit/Adafruit_MAX31865
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `max31865_temp` : Température (°C)

## Points d'attention

- Soudez les ponts 2/3/4 fils du module selon votre sonde.
- Rref = 430 Ω pour PT100, 4300 Ω pour PT1000.

## Utilisation

1. Ouvrez `max31865.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
