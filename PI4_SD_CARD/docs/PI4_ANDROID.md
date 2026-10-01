# NEXUS : ESP32-S3, Raspberry Pi 4 et deux microSD

Le S3 reste le maître du labo et l’unique autorité de flash. Le Pi 4 fournit le stockage, la compilation des firmwares et l’assistance locale.

## Supports et préparation

- La clé USB de 8 Go démarre Raspberry Pi OS Lite 64 bits.
- La microSD de 64 Go reste dans le Pi; elle stocke projets, firmwares et cache sous `/srv/nexus/shared`.
- La microSD de 2 Go reste dans le S3; elle contient la copie autonome du dossier `SD_CARD/`.
- Les deux cartes ne sont pas déplacées ni montées dans l’autre appareil. Le S3 atteint le Pi par Wi-Fi.

Démarre le Pi depuis la clé USB, copie `PI4_SD_CARD/` et `SD_CARD/` dans `~/NEXUS_LAB/`, puis configure la microSD de 64 Go seulement si nécessaire :

    sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0
    sudo bash pi/install.sh
    sudo bash pi/connect_to_master_ap.sh
    sudo bash pi/setup_arduino.sh

La première commande efface uniquement le périphérique choisi, après contrôle de sa capacité et confirmation exacte. Vérifie que `/dev/mmcblk0` est bien la carte 64 Go et sauvegarde son contenu avant. L’installation ne formate pas le support.

Pour la carte du S3 : formate séparément la microSD de 2 Go en FAT32, exécute `python scripts/prepare_sd.py` sur le PC, puis copie le **contenu** de `SD_CARD/` à la racine de la carte. Les binaires compilés et leurs explications sont dans ce dossier.

## APK et QR

`ANDROID/app-debug.apk` est l’application générale NEXUS, pas une APK de projet. Exporte ton projet du Studio, puis sur Windows lance `scripts/build_project_apk.bat "C:\chemin\vers\projet"` et `scripts/publish_project_apk.bat`. Cette dernière envoie l’APK au Pi, vérifie son empreinte et crée un lien/QR LAN réel. Les outils Android du projet n’assurent pas la compilation sur Pi 4 ARM64.

## Limites des vérifications

Les scripts contrôlent les fichiers et les fonctions simulables, pas le matériel. Le relais Wi-Fi/NAT, le partage S3→Pi, les workers et les capteurs devront être essayés sur tes appareils.
