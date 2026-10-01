# Montage du MASTER (ESP32-S3 N16R8 / YD-ESP32-S3)

| Élément | Broche du module | GPIO ESP32-S3 |
|---|---|---|
| microSD (SPI) | CS | 10 |
| | MOSI | 11 |
| | SCK | 12 |
| | MISO | 13 |
| | VCC / GND | 3V3 / GND |
| DHT11 ou DHT22 | DATA (tirage 10 kΩ vers 3V3 si capteur nu) | 4 (réglable) |
| LED RGB embarquée | — | 48 (DevKitC-1 v1.0, YD-ESP32-S3) ou 38 (DevKitC-1 v1.1) |
| Bouton BOOT | — | 0 : 3 s = identifiants, 10 s = réinitialisation usine |
| USB hôte (Arduino cible) | connecteur **USB-OTG** (D− 19, D+ 20) | voir `USB_AVR.md` |

Broches à ne pas utiliser : 19/20 (USB), 26 à 37 (flash et PSRAM octale), 43/44 (console série), 0/3/45/46 (strapping).

## Codes de la LED RGB
| Couleur / effet | Signification |
|---|---|
| bleu respirant | démarrage |
| vert respirant | prêt |
| bleu-vert respirant | job en cours |
| blanc clignotant | identification demandée (bouton « Repérer » ou BOOT 3 s) |
| violet clignotant | flash d'un worker ou d'une carte Arduino |
| orange clignotant | mise à jour OTA en cours |
| orange fixe | avertissement |
| rouge clignotant | erreur (microSD, OTA, réinitialisation usine) |

## Alimentation
- Le port USB d'un PC fournit environ 500 mA : suffisant pour le MASTER, la microSD et un DHT.
- Pour alimenter une carte Arduino par l'USB-OTG, utilisez un **hub OTG alimenté** ou un câble Y : le S3 ne fournit pas de 5 V fiable sur son connecteur OTG.
- Moteurs, servos, rubans LED : alimentation séparée, masses reliées. Jamais directement sur une GPIO.

## Banc fantôme (deux workers)
Le worker **émulateur** doit être un ESP32 DevKit classique si le projet contient un capteur analogique (seul l'ESP32 a un DAC).
Son connecteur de banc :

| Rôle | GPIO de l'émulateur |
|---|---|
| Sorties analogiques (DAC 8 bits) | 25, 26 |
| Capteurs tout-ou-rien simulés | 16, 17, 4 |
| Actionneurs observés (niveau, PWM) | 18, 19, 23 (tirage interne vers GND) |
| Esclave I2C | 21 (SDA), 22 (SCL) — tirages 4,7 kΩ vers 3V3 |

- Reliez **toujours les masses** des deux cartes.
- Retirez les capteurs réels et **débranchez les charges** (relais, lampes, moteurs) : la sortie du DUT va directement sur l'entrée de l'émulateur.
- Le tableau de câblage exact de chaque projet est affiché dans le tiroir « Banc fantôme » (bibliothèque ou Studio).

## Montages des projets
Chaque projet de la bibliothèque contient son tableau de câblage (onglets *Câblage* et *Brochage* de l'interface, ou `README.md` du projet). Les broches sont choisies automatiquement pour éviter les broches de strapping, les entrées seules pour les sorties, l'ADC2 (inutilisable avec le Wi-Fi) et les conflits d'adresse I2C.
