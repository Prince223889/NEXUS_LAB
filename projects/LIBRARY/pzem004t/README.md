# PZEM-004T v3 (compteur d'énergie)

Compteur d'énergie monophasé : tension, courant, puissance, énergie cumulée, fréquence et facteur de puissance.

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 10 mA (pointe 10 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| PZEM-004T v3 (compteur d'énergie) | VCC | 5V (VIN) |  |
| PZEM-004T v3 (compteur d'énergie) | GND | GND |  |
| PZEM-004T v3 (compteur d'énergie) | TX du PZEM | GPIO16 |  |
| PZEM-004T v3 (compteur d'énergie) | RX du PZEM | GPIO17 |  |

## Bibliothèques

- **PZEM004Tv30** 1.2.1 — https://github.com/mandulaj/PZEM-004T-v30

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `pzem_volt` : Tension (V)
- `pzem_curr` : Courant (A)
- `pzem_power` : Puissance (W)
- `pzem_energy` : Énergie (kWh)
- `pzem_freq` : Fréquence (Hz)
- `pzem_pf` : Facteur de puissance

## Points d'attention

- DANGER 230 V : installation par une personne qualifiée, dans un boîtier fermé.
- La sortie série du PZEM est en 5 V : pont diviseur sur son TX recommandé.

## Utilisation

1. Ouvrez `pzem004t.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
