# Contrôle d'accès RFID + servo + dashboard Wi-Fi

Badge RFID, verrou à servomoteur et page web de suivi.

- **Catégorie** : Classiques ESP32 (système & réseau)
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 0 mA (pointe 0 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|

## Bibliothèques

- **MFRC522** 1.4.12 — https://github.com/miguelbalboa/rfid
- **ESP32Servo** 3.2.1 — https://github.com/madhephaestus/ESP32Servo

## Utilisation

1. Ouvrez `classic_acces_rfid_web.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
