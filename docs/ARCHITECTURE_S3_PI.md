# NEXUS S3 + Pi avec deux microSD distinctes

## Les appareils et leurs rôles

- **ESP32-S3 MASTER :** chef du laboratoire, interface locale, worker pool, jobs matériel, validations, commandes et autorisation finale de chaque flash.
- **Raspberry Pi 4 :** adjoint de calcul et de stockage quand il est allumé. Il garde les projets nommés, les firmwares, le cache et l’historique; il compile et héberge les APK.
- **Workers :** se connectent au point d’accès ESP32-LAB du S3. Le Pi s’y connecte aussi. Le worker obtient le binaire signé du Pi, vérifie son SHA-256 puis attend l’ordre du S3.
- **Clé USB de 8 Go :** système Raspberry Pi OS Lite du Pi.
- **microSD de 64 Go :** données, projets, firmwares et cache du Pi; elle reste dans le Pi.
- **microSD de 2 Go :** contenu autonome `SD_CARD/` du S3; elle reste dans le S3.

Le flux de flash reste : Studio → projet sauvegardé sur la carte accessible par le Pi → compilation avec durée/progression/journal → binaire signé hébergé par le Pi → confirmation administrateur sur le S3 → ordre S3 au worker → vérification du SHA-256 → flash worker → suivi du retour. Le Pi ne prend pas le contrôle du matériel.

Le S3 agit aussi comme passerelle Internet : si son Wi-Fi amont est configuré et connecté, il partage cette connexion au Pi et aux workers. Le Wi-Fi du Pi garde une métrique 600 afin de laisser Ethernet prioritaire quand il est présent. Sans Wi-Fi amont, le réseau local du labo continue normalement. Le S3 peut accepter dix clients : avec le Pi, il reste jusqu’à neuf workers.

## Flash en un clic

Le bouton **Flasher** existe dans le Studio. Dans la Bibliothèque, il s'appelle **Flasher sur un worker**. Il enchaîne cinq étapes :

1. **Worker** : choisis le worker. Sa puce est détectée (ESP32, S3 ou C3) et le code est adapté à cette carte.
2. **Montage** : le schéma s'affiche. Coche « Le montage est câblé comme sur le schéma ».
3. **Firmware** :
   - Un projet de la bibliothèque déjà compilé est lu sur la microSD du S3. Le flash est immédiat et le Pi n'est pas nécessaire.
   - Un projet nouveau ou modifié est envoyé au Pi, qui le compile. Le **temps prévu** s'affiche avant de commencer. Il vient de l'historique du Pi : la dernière compilation de ce projet, sinon la médiane des compilations de la même carte, sinon une estimation prudente de 7 à 8 minutes pour une première compilation sur un Pi 4. Les compilations déjà en file sont comptées. Une barre affiche ensuite le temps écoulé et le temps restant. Un projet déjà dans le cache du Pi est prêt en 2 secondes.
4. **Flash** : le S3 autorise l'OTA. Le worker télécharge le firmware, vérifie son SHA-256 et redémarre sur le projet.
5. **Vérification** : le moniteur du worker est lu pendant 25 secondes. Patricia, sur le Pi, ou l'analyse locale du S3 si le Pi est absent, donne un verdict : ça fonctionne, échec ou incertain, avec les raisons. Si la compilation échoue, le journal est diagnostiqué : bibliothèque manquante, erreur de code…

## Avec et sans le Pi

| Fonction | Pi allumé | Pi absent |
|---|---|---|
| Interface, workers, jobs, capteurs en direct, Réseau, Outils | ✓ | ✓ (le S3 suffit) |
| Bibliothèque, montages, code, Studio, .ino et .zip | ✓ | ✓ (générés dans le navigateur) |
| Flasher un projet de la bibliothèque déjà compilé | ✓ | ✓ (binaire sur la microSD du S3) |
| Flasher un projet nouveau ou modifié | ✓ compilé par le Pi | ✗ télécharge le .ino pour l'Arduino IDE, ou compile sur PC avec `scripts\compile_all.bat` |
| Vérification du moniteur après flash | Patricia | analyse locale du S3 |
| Patricia : mémoire, voix, IA, flotte de voitures | ✓ | assistant de secours du S3 (état du labo, câblage du catalogue) |
| Studio APK et appli web | ✓ | ✗ (le Pi fabrique les APK) |

## Les deux cartes et leur contenu

Le Pi démarre sur la **clé USB de 8 Go**. Sa **microSD de 64 Go** est un volume FAT32 séparé, monté sur `/srv/nexus/shared`. La microSD de **2 Go du S3 est un autre support** : elle contient la bibliothèque, les binaires `.bin`, les firmwares `.hex`, les montages et les explications du dossier `SD_CARD/`.

- **Pi allumé :** le Pi lit et écrit sa microSD de 64 Go. Le S3 et le téléphone accèdent aux projets et firmwares du Pi par le Wi-Fi et l’API protégée.
- **Pi éteint ou hors réseau :** le S3 garde ses fonctions locales et retrouve les fichiers de sa propre microSD de 2 Go.
- Les cartes restent dans leurs appareils. Ne retire jamais une carte pendant une écriture.

Formate séparément les deux cartes en FAT32. Depuis le Pi démarré sur l’USB, lance `sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0` **uniquement si `/dev/mmcblk0` est bien la microSD de 64 Go**. Cette commande efface la cible après contrôle et confirmation interactive; elle refuse la clé système et les disques d’une capacité inattendue. Ensuite `sudo bash pi/install.sh` monte `/srv/nexus/shared` et copie les fichiers fournis. Aucun script ne formate automatiquement pendant l’installation. Pour le S3, formate sa microSD de 2 Go en FAT32, exécute `python scripts/prepare_sd.py`, puis copie le contenu de `SD_CARD/` à la racine de cette carte.

Les dossiers `PROJECTS/`, `FIRMWARE/` et le cache de compilation sont conservés sur la microSD 64 Go du Pi; SQLite et les journaux restent sur sa clé USB système. La carte 2 Go du S3 garde sa copie autonome. Le Pi sert les nouveaux projets et binaires au S3 par Wi-Fi; les deux appareils n’ont pas besoin d’échanger leurs cartes.

## Installation du Pi par SSH

Démarre Raspberry Pi OS Lite 64 bits depuis la clé USB 8 Go, active SSH et garde le Pi connecté au réseau. Copie PI4_SD_CARD/ et SD_CARD/ du ZIP vers le Pi avec scripts/deploy_pi_ssh.bat ou scp, puis exécute :

    sudo bash pi/prepare_shared_sd.sh --format /dev/mmcblk0
    sudo bash pi/install.sh
    sudo bash pi/connect_to_master_ap.sh
    sudo bash pi/setup_arduino.sh
    sudo systemctl status nexus-agent
    curl -s http://127.0.0.1:8088/api/v1/health

La préparation de carte est la seule étape qui efface un support, et elle exige confirmation interactive. Consulte le jeton localement avec sudo grep '^NEXUS_TOKEN=' /etc/nexus/nexus.env; ne le partage pas et n’expose pas le port 8088 à Internet. Garde Ethernet ou une session SSH accessible pendant la configuration Wi-Fi.

## Studio, projets et APK

Le Studio pose des questions guidées, suggère cartes et capteurs, montre les blocs SI/ALORS, propose câblage et code, et permet de nommer puis reprendre les projets. Le catalogue et les réponses locales fonctionnent hors ligne. L’assistant distant exige un fournisseur et des identifiants choisis par l’utilisateur via NEXUS_AI_ENDPOINT, NEXUS_AI_KEY et NEXUS_AI_MODEL.

ANDROID/app-debug.apk est l’application NEXUS générale, pas l’APK du projet créé. L’APK de projet est produite sur Windows depuis un export Studio avec scripts/build_project_apk.bat, puis scripts/publish_project_apk.bat l’envoie au Pi pour générer un lien local et son QR. Les outils Android fournis ne permettent pas un build fiable sur Pi 4 ARM64. Une APK debug n’est pas signée Play Store.

## Vérifications

Les scripts valident le code, les API, le stockage simulé, la signature et les chemins. Ils ne prouvent pas la radio, le partage Internet, un vrai build ESP-IDF sur S3, le câblage ni le flash d’un worker. Ces essais nécessitent le matériel. Aucun script de vérification ne lance un flash.
