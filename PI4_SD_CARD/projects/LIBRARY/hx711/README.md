# Balance HX711 + cellule de charge

Convertisseur 24 bits pour cellule de charge : balance de cuisine, ruche connectée, niveau de réservoir.

- **Catégorie** : Mouvement, orientation & vibrations
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 1.5 mA (pointe 1.5 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Balance HX711 + cellule de charge | VCC | 3V3 |  |
| Balance HX711 + cellule de charge | GND | GND |  |
| Balance HX711 + cellule de charge | DT | GPIO34 |  |
| Balance HX711 + cellule de charge | SCK | GPIO4 |  |

## Bibliothèques

- **HX711 Arduino Library** 0.7.5 — https://github.com/bogde/HX711

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `scale_weight` : Poids (g)

## Points d'attention

- Étalonnage : posez une masse connue et ajustez « cal » = lecture brute / masse.

## Utilisation

1. Ouvrez `hx711.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
