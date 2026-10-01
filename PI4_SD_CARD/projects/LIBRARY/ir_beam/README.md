# Barrière infrarouge (émetteur + récepteur)

Faisceau IR coupé = passage détecté : compteur de passages, détection d'intrusion.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Barrière infrarouge (émetteur + récepteur) | VCC | 3V3 |  |
| Barrière infrarouge (émetteur + récepteur) | GND | GND |  |
| Barrière infrarouge (émetteur + récepteur) | récepteur (collecteur ouvert) | GPIO4 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `beam_cut` : Faisceau coupé
- `beam_passes` : Passages

## Utilisation

1. Ouvrez `ir_beam.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
