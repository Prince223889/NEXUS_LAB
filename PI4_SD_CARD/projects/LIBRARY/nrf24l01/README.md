# Radio nRF24L01+ (2,4 GHz)

Liaison radio bas coût entre cartes (100 m, 1000 m en version PA+LNA) : envoie un compteur et écoute les réponses.

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 12 mA (pointe 115 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Radio nRF24L01+ (2,4 GHz) | VCC | 3V3 |  |
| Radio nRF24L01+ (2,4 GHz) | GND | GND |  |
| Radio nRF24L01+ (2,4 GHz) | SCK | GPIO18 |  |
| Radio nRF24L01+ (2,4 GHz) | MISO | GPIO19 |  |
| Radio nRF24L01+ (2,4 GHz) | MOSI | GPIO23 |  |
| Radio nRF24L01+ (2,4 GHz) | CE | GPIO13 |  |
| Radio nRF24L01+ (2,4 GHz) | CSN | GPIO4 |  |

## Bibliothèques

- **RF24** 1.6.2 — https://github.com/nRF24/RF24

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `nrf_tx` : Envoyé
- `nrf_rx` : Reçu

## Points d'attention

- Condensateur 10-100 µF au plus près des broches VCC/GND du module : indispensable.
- 3,3 V uniquement.

## Utilisation

1. Ouvrez `nrf24l01.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
