# ZMPT101B (tension secteur AC)

Transformateur de mesure isolé : tension efficace du secteur (étalonnage requis).

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 5 mA (pointe 5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| ZMPT101B (tension secteur AC) | VCC | 3V3 |  |
| ZMPT101B (tension secteur AC) | GND | GND |  |
| ZMPT101B (tension secteur AC) | OUT | GPIO34 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `zmpt_vrms` : Tension efficace (V)

## Points d'attention

- DANGER 230 V : le côté secteur doit être câblé et protégé par une personne qualifiée.
- Étalonnez « k » avec un multimètre.

## Utilisation

1. Ouvrez `zmpt101b.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
