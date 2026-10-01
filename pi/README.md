# NEXUS-AGENT : Pi adjoint, S3 boss

Le MASTER ESP32-S3 garde le tableau de bord et commande les workers. Le Pi compile, sert les projets et conserve les fichiers. Seul le S3 autorise et supervise un flash.

## Matériel et deux cartes

Le Pi démarre sur Raspberry Pi OS Lite 64 bits installé sur ta **clé USB de 8 Go**. Sa **microSD de 64 Go** reste dédiée aux données et est montée en FAT32 sur `/srv/nexus/shared`. Le **S3 garde sa propre microSD de 2 Go** avec le contenu autonome `SD_CARD/`. Le Pi rejoint le point d’accès ESP32-LAB du S3; si le S3 a lui-même Internet, il le partage au Pi. Ethernet reste prioritaire si connecté.

Les deux cartes restent dans leurs appareils. Le S3 et le Pi échangent projets et firmwares par Wi-Fi; le S3 fonctionne aussi hors Pi avec les fichiers présents sur sa carte de 2 Go. Ne retire pas une carte pendant une écriture.

La carte doit être en FAT32 avec le label NEXUS. La préparer depuis le Pi démarré sur l’USB :

    lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINTS
    sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0

Le script vérifie le disque, refuse le support système et les partitions montées, vérifie la capacité puis demande de taper EFFACER /dev/mmcblk0. Cette opération efface la carte de 64 Go. Sauvegarde son contenu avant de confirmer. Ensuite :

    sudo bash pi/install.sh
    sudo bash pi/connect_to_master_ap.sh
    sudo bash pi/setup_arduino.sh
    sudo systemctl status nexus-agent
    curl -s http://127.0.0.1:8088/api/v1/health

install.sh monte `/srv/nexus/shared`, copie les dossiers de `SD_CARD/` présents dans le paquet et configure les répertoires NEXUS. Il ne reformate rien. Les projets, firmwares, sources Arduino et cache de build vont sur la carte Pi de 64 Go. SQLite et les journaux restent sur l’USB système.

Copie les dossiers PI4_SD_CARD/ et SD_CARD/ dans ~/NEXUS_LAB/ du Pi via scripts/deploy_pi_ssh.bat ou SSH. Configure ensuite le SSID amont du S3 dans NEXUS si le partage Internet est souhaité. Le Pi occupe un client AP; jusqu’à neuf workers peuvent rejoindre les dix places.

Le jeton API est créé localement et se lit avec sudo grep '^NEXUS_TOKEN=' /etc/nexus/nexus.env. Ne le partage pas et n’expose pas le port 8088 à Internet.

La réception WhatsApp est facultative et nécessite une URL HTTPS publique ainsi que les secrets Meta et une liste blanche configurés dans `/etc/nexus/nexus.env`. Voir `docs/WHATSAPP.md`; aucun message n’est envoyé automatiquement.

## APK, IA et workers

ANDROID/app-debug.apk est l’application NEXUS générale. Pour créer l’APK d’un projet Studio, exporte-le et lance scripts/build_project_apk.bat "C:\chemin\vers\projet" sur Windows. scripts/publish_project_apk.bat envoie l’APK au Pi, la vérifie et crée un lien/QR local. Le build Gradle de ce projet n’est pas pris en charge sur Pi 4 ARM64.

Le Studio peut fonctionner sans fournisseur IA : catalogue, questions à choix, projets enregistrés, blocs logiques, câblage et génération de code sont locaux. Pour un assistant en ligne, configure un endpoint et une clé dans les réglages; aucune clé n’est incluse dans l’archive.

Les builds ESP32/S3/C3 s’exécutent dans la file Pi avec 1 à 4 workers configurables; commence à 1 sur Pi 4. Le Pi héberge les binaires vérifiés. Le S3 sélectionne la carte, demande confirmation, donne l’ordre au worker et surveille le redémarrage.

## Contrôles SSH

    lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINTS
    findmnt /srv/nexus/shared
    sudo systemctl status nexus-agent
    sudo journalctl -u nexus-agent -n 100 --no-pager
    curl -s http://127.0.0.1:8088/api/v1/health
    arduino-cli core list

Les contrôles logiciels ne remplacent pas les essais réels de Wi-Fi, carte, worker, capteurs et flash.
