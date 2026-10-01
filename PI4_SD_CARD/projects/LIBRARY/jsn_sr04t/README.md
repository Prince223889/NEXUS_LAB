# JSN-SR04T (ultrasons étanche)

Version étanche à sonde déportée, 25-450 cm : niveau de cuve, parking.

- **Catégorie** : Distance & présence
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★☆☆
- **Consommation estimée** : 15 mA (pointe 15 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| JSN-SR04T (ultrasons étanche) | VCC | 5V (VIN) |  |
| JSN-SR04T (ultrasons étanche) | GND | GND |  |
| JSN-SR04T (ultrasons étanche) | TRIG | GPIO4 |  |
| JSN-SR04T (ultrasons étanche) | ECHO | GPIO34 | pont diviseur 1 kΩ / 2 kΩ : ECHO sort du 5 V |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `jsn_sr04t_dist` : Distance (cm)

## Points d'attention

- JSN-SR04T (ultrasons étanche) : la broche ECHO délivre 5 V : utilisez un pont diviseur (1 kΩ / 2 kΩ) ou un convertisseur de niveau.

## Utilisation

1. Ouvrez `jsn_sr04t.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
