# ACS712 (courant à effet Hall 5/20/30 A)

Capteur de courant isolé AC/DC : 185 mV/A (5 A), 100 mV/A (20 A), 66 mV/A (30 A).

- **Catégorie** : Courant, tension & énergie
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 10 mA (pointe 10 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| ACS712 (courant à effet Hall 5/20/30 A) | VCC | 5V (VIN) |  |
| ACS712 (courant à effet Hall 5/20/30 A) | GND | GND |  |
| ACS712 (courant à effet Hall 5/20/30 A) | OUT | GPIO34 | pont diviseur 10 kΩ / 20 kΩ : sortie 0-5 V centrée sur 2,5 V |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `acs712_amp` : Courant (A)

## Points d'attention

- Démarrez sans charge pour que le zéro soit mesuré correctement.
- Pour le secteur 230 V, faites câbler l'installation par une personne qualifiée.

## Utilisation

1. Ouvrez `acs712.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
