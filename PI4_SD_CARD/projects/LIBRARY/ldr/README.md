# Photorésistance (LDR / GL5528)

Cellule photoélectrique en pont diviseur avec une résistance de 10 kΩ : niveau de luminosité relatif.

- **Catégorie** : Lumière, couleur & infrarouge
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Photorésistance (LDR / GL5528) | VCC | 3V3 |  |
| Photorésistance (LDR / GL5528) | GND | GND |  |
| Photorésistance (LDR / GL5528) | point milieu | GPIO34 | LDR entre 3V3 et le point milieu, 10 kΩ entre le point milieu et GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `ldr_light` : Luminosité (%)

## Utilisation

1. Ouvrez `ldr.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
