# Lecteur MP3 DFPlayer Mini

Lit des fichiers MP3 depuis une microSD vers un haut-parleur 3 W : annonces vocales, alarme sonore.

- **Catégorie** : Actionneurs : LED, relais, son
- **Carte de référence** : ESP32 DevKit V1 (WROOM-32) (Arduino IDE : cœur esp32 3.3.x)
- **Difficulté** : ★★☆
- **Consommation estimée** : 20 mA (pointe 300 mA) + carte ESP32

## Câblage

| Module | Broche | Vers l'ESP32 | Remarque |
|---|---|---|---|
| Lecteur MP3 DFPlayer Mini | VCC | 5V (VIN) |  |
| Lecteur MP3 DFPlayer Mini | GND | GND |  |
| Lecteur MP3 DFPlayer Mini | TX du DFPlayer | GPIO16 |  |
| Lecteur MP3 DFPlayer Mini | RX du DFPlayer (via 1 kΩ) | GPIO17 |  |
| Lecteur MP3 DFPlayer Mini | SPK1 / SPK2 | haut-parleur 4-8 Ω, 3 W max |  |

## Bibliothèques

- **DFRobotDFPlayerMini** 1.0.5 — https://github.com/DFRobot/DFRobotDFPlayerMini

## Points d'attention

- Fichiers nommés 0001.mp3, 0002.mp3… sur une microSD FAT32 ≤ 32 Go.
- Alimentez Lecteur MP3 DFPlayer Mini directement en 5 V externe et reliez les masses (GND commun).

## Utilisation

1. Ouvrez `dfplayer.ino` dans l'IDE Arduino, carte **ESP32 Dev Module**.
2. Installez les bibliothèques listées ci-dessus (Outils > Gérer les bibliothèques).
3. Câblez selon le tableau, téléversez, puis ouvrez le moniteur série à 115200 bauds.
4. Outils > Traceur série affiche les courbes en direct.

_Généré par ESP32 LAB Studio 6.1.0 — modifiable librement._
