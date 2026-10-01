# Enregistreur DHT22 + BH1750 + DS3231 (CSV série)

Journal horodaté en CSV sur le port série.

- **Catégorie** : Classiques ESP32 (système & réseau)
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 0 mA (pointe 0 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|

## Bibliothèques

- **DHT sensor library** 1.4.7 — https://github.com/adafruit/DHT-sensor-library
- **Adafruit Unified Sensor** 1.1.15 — https://github.com/adafruit/Adafruit_Sensor
- **BH1750** 1.3.0 — https://github.com/claws/BH1750
- **RTClib** 2.1.4 — https://github.com/adafruit/RTClib
- **Adafruit BusIO** 1.17.4 — https://github.com/adafruit/Adafruit_BusIO

## Utilisation

1. Ouvrez `classic_datalogger_csv.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
