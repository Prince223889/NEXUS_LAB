# Bouton-poussoir (anti-rebond)

Bouton avec tirage interne et anti-rebond logiciel : appui court, compteur et appui long.

- **Catégorie** : Boutons, claviers & commandes
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 1 mA (pointe 1 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Bouton-poussoir (anti-rebond) | VCC | 3V3 |  |
| Bouton-poussoir (anti-rebond) | GND | GND |  |
| Bouton-poussoir (anti-rebond) | borne 1 | GPIO4 | borne 2 vers GND |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `btn_pressed` : Appuyé (0/1)
- `btn_count` : Appuis

## Utilisation

1. Ouvrez `button.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
