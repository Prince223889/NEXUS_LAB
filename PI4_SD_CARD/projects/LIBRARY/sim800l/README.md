# Modem GSM SIM800L (SMS, appels)

Modem 2G : envoie des SMS d'alerte, mesure la qualité du réseau (commandes AT).

- **Catégorie** : Communication & radio
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★★
- **Consommation estimée** : 20 mA (pointe 2000 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Modem GSM SIM800L (SMS, appels) | VCC | 3V3 | 3,7-4,2 V / 2 A (batterie Li-ion), PAS le 3V3 de l'ESP32 |
| Modem GSM SIM800L (SMS, appels) | GND | GND |  |
| Modem GSM SIM800L (SMS, appels) | TXD du SIM800L | GPIO16 |  |
| Modem GSM SIM800L (SMS, appels) | RXD du SIM800L | GPIO17 |  |

## Bibliothèques

Aucune : tout est inclus dans le cœur Arduino-ESP32.

## Mesures publiées (moniteur et traceur série, 115200 bauds)

- `gsm_csq` : Qualité (0-31)
- `gsm_dbm` : Signal (dBm)

## Points d'attention

- Le SIM800L consomme des pics de 2 A : alimentation 4 V dédiée + condensateur 1000 µF, sinon il redémarre.
- Les réseaux 2G ferment progressivement (vérifiez votre opérateur).
- Consommation de pointe estimée 2080 mA : prévoyez une alimentation externe 5 V (le port USB d'un PC fournit ~500 mA).

## Utilisation

1. Ouvrez `sim800l.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
