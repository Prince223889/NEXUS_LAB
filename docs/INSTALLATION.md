# Installation

## 1. MASTER — ESP32-S3 N16R8 (ESP-IDF 6.1)

### Préparer ESP-IDF sous Windows
1. Installez ESP-IDF **v6.1** avec l'installateur officiel (EIM) dans un chemin **court et sans espace**, par exemple `C:\esp\v6.1\esp-idf`.
2. Placez aussi le projet dans un chemin court : `C:\lab\ESP32_LAB` (les chemins longs cassent les builds Windows).
3. Ouvrez « ESP-IDF 6.1 PowerShell » (ou exécutez `C:\esp\v6.1\esp-idf\export.ps1`).
4. Vérifiez : `idf.py --version` doit afficher `v6.1`.
5. En cas de doute : `scripts\doctor_windows.ps1` contrôle les outils, le chemin et l'horloge des fichiers.

### Compiler et flasher
```powershell
cd C:\lab\ESP32_LAB\firmware\master
idf.py build                  # la cible esp32s3 est définie dans sdkconfig.defaults
idf.py -p COM7 flash monitor  # port USB-UART (CH343) de la carte, pas le port USB-OTG
```
Ou simplement `scripts\build_master.ps1 -Port COM7`.

Au premier build, le gestionnaire de composants télécharge : cJSON, mDNS, led_strip, usb, usb_host_cdc_acm, ch34x, cp210x, ftdi (versions figées dans `main/idf_component.yml`). Une connexion Internet est donc nécessaire la première fois.

> Si vous aviez un ancien dossier `build/` ou `sdkconfig` d'une version précédente, supprimez-les : `Remove-Item -Recurse build, sdkconfig`.

### Premier démarrage
Le moniteur série affiche :
```
================ PREMIER DEMARRAGE ================
Wi-Fi AP      : ESP32-LAB
Mot de passe  : ESP32-LAB-Setup2026!
Dashboard     : http://192.168.4.1/  ou  http://esp32-lab.local/
Accès admin   : http://192.168.4.1/x-control-xxxxxxxx
Mot de passe admin : xxxxxxxxxxxx
```
**Notez le chemin d'accès admin et le mot de passe admin** : ils sont uniques à votre carte. Pour les réafficher, maintenez le bouton **BOOT 3 s**. Pour une remise à zéro usine, maintenez **BOOT 10 s**.

Changez ensuite le mot de passe du Wi-Fi dans **Réglages › Configuration** : le MASTER le transmet automatiquement aux workers connectés.

## 2. microSD
- Format **FAT32** (une carte de 64 Go doit être formatée en FAT32 avec un outil tiers, Windows ne le propose pas au-delà de 32 Go ; ou créez une partition de 32 Go).
- `python scripts/prepare_sd.py` construit `SD_CARD/` (projets, base de données, exemples de configuration) ; copiez son contenu à la racine de la carte.
- Le MASTER crée lui-même les dossiers manquants au démarrage.

Le S3 utilise sa microSD de 2 Go. Le Raspberry Pi utilise une carte de 64 Go distincte pour ses données et démarre depuis la clé USB de 8 Go. Les deux microSD restent dans leurs appareils; consultez [ARCHITECTURE_S3_PI.md](ARCHITECTURE_S3_PI.md) pour l’installation Wi-Fi du Pi.

## 3. Workers (1 à 10 ESP32)
1. Arduino IDE 2.x → Gestionnaire de cartes → **esp32 by Espressif 3.3.x**.
2. Ouvrez `firmware/worker/worker.ino`.
3. Carte « ESP32 Dev Module » (ou « ESP32S3 Dev Module »), *Partition Scheme* **Minimal SPIFFS (1.9MB APP with OTA)**.
4. Téléversez. Aucune bibliothèque externe n'est nécessaire.
5. Le worker rejoint `ESP32-LAB`, le MASTER lui attribue un numéro W1…W10 : il apparaît dans **Workers**.

Pour les mises à jour OTA des workers : Arduino IDE › Croquis › *Exporter les binaires compilés*, déposez le `.bin` dans `/FIRMWARE` via la page Fichiers, puis Workers › ⋯ › *Mettre à jour le firmware*.

PlatformIO : `pio run -d firmware/worker -e esp32` (ou `-e esp32s3`).

## 4. Vos projets
Dans la **Bibliothèque** ou le **Studio**, téléchargez le `.zip` d'un projet, ouvrez le `.ino`, installez les bibliothèques indiquées (versions testées listées dans le README du projet) et téléversez. Activez « Envoyer au MASTER » pour voir les mesures dans **Capteurs en direct**.
