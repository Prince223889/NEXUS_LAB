# Bus CAN MCP2515 + TJA1050

Contrôleur CAN 500 kbit/s : envoie une trame de test et affiche le trafic du bus.

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 10 mA (pointe 10 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Bus CAN MCP2515 + TJA1050 | VCC | 5V (VIN) |  |
| Bus CAN MCP2515 + TJA1050 | GND | GND |  |
| Bus CAN MCP2515 + TJA1050 | SCK | GPIO18 |  |
| Bus CAN MCP2515 + TJA1050 | MISO | GPIO19 |  |
| Bus CAN MCP2515 + TJA1050 | MOSI | GPIO23 |  |
| Bus CAN MCP2515 + TJA1050 | CS | GPIO4 |  |
| Bus CAN MCP2515 + TJA1050 | INT | GPIO34 |  |

## Bibliothèques

- **mcp_can** 1.5.1 — https://github.com/coryjfowler/MCP_CAN_lib

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `can_sendok` : Envoi OK

## Points d'attention

- Le TJA1050 exige 5 V ; le MCP2515 fonctionne en 3,3 ou 5 V (vérifiez votre module).
- Terminaison 120 Ω (cavalier J1) aux extrémités du bus.

## Utilisation

1. Ouvrez `mcp2515.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
