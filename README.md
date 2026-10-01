# ESP32 LAB 6.0 « NEXUS »

Laboratoire ESP32 autonome : **1 MASTER ESP32-S3** qui crée son propre Wi-Fi, pilote **jusqu'à 10 workers ESP32**, reçoit les mesures de vos montages, programme des cartes Arduino par USB et embarque une **bibliothèque de 320 projets** prêts à téléverser — le tout depuis un navigateur, sur PC comme sur téléphone, sans Internet.

Dépôt GitHub : [Prince223889/ESP32-box](https://github.com/Prince223889/ESP32-box). Les mises à jour OTA du S3 utilisent les fichiers publiés dans une GitHub Release; voir [docs/OTA.md](docs/OTA.md).

```
 Téléphone / PC ──Wi-Fi « ESP32-LAB »──►  MASTER ESP32-S3 (ESP-IDF 6.1)
                                            ├─ interface web (192.168.4.1 · esp32-lab.local)
                                            ├─ microSD locale facultative : projets, firmwares, journaux, rapports
                                            ├─ USB hôte : moniteur série + flash Arduino (.hex)
                                            └─ UDP 4211 ◄──► Workers W1…W10 (Arduino-ESP32 3.3)
                                               UDP 4213 ◄─── vos montages (mesures en direct)
```

## Ce que fait l'interface web

| Section | Fonctions |
|---|---|
| **Tableau de bord** | Indicateurs en direct (WebSocket), courbes mémoire/ambiance/workers, connectivité, journal, autodiagnostic en 10 points |
| **Workers** | Cartes de chaque worker (RAM, signal, uptime, job en cours), ping, clignotement pour repérer la carte, scan Wi-Fi avec **conseil de canal**, renommage, mise à jour OTA depuis la microSD locale ou le Pi/GitHub, actions sur toute la flotte |
| **Jobs** | File à priorités : check-up, benchmark, test flash, test mémoire, scan I2C, scan Wi-Fi… ; annulation, historique, export CSV |
| **Capteurs en direct** | Mesures envoyées par vos montages, mini-courbes, **traceur multi-courbes**, **alertes** (seuils min/max avec notification et bip), export CSV |
| **Bibliothèque** | 320 projets (219 capteurs/modules, 52 montages complets, 49 classiques) : code coloré, câblage, **brochage visuel**, bibliothèques et versions exactes, téléchargement **.zip**, favoris, filtres par carte |
| **Studio** | Assemblez capteurs + actionneurs : **attribution automatique des broches sans conflit**, automatismes « si… alors… sinon » avec hystérésis ou commande proportionnelle, **variables liées aux capteurs** (conversion, consignes), **pilotage par application** (`/set`), **schéma de montage**, page web, envoi au MASTER, MQTT, budget énergétique, liste du matériel, **lien de partage** |
| **Réseau (Wireshark du Labo)** | Décodage en direct des trames du labo (mesures `LAB\|`, battements, découverte, logs, HTTP), **perte et gigue par worker**, filtres, pause, export CSV. Capture explicite (armée à la demande), uniquement le trafic du labo |
| **Banc fantôme** | Test matériel automatique d'un projet par deux workers : l'un **imite les capteurs** (DAC, GPIO, esclave I2C) et observe les actionneurs, l'autre exécute le projet. Scénario et résultats attendus déduits des automatismes (seuils, hystérésis, commande proportionnelle), rapport sur la microSD |
| **Outils** | Brochage interactif ESP32/S3/C3, **carte des adresses I2C** façon `i2cdetect`, budget énergie et autonomie batterie, résistance de LED, pont diviseur, code couleur (dans les deux sens), PWM LEDC, ADC, fuseaux POSIX, convertisseur hexa/binaire |
| **Fichiers** | Explorateur microSD, glisser-déposer, renommer/supprimer, aperçu du code, **graphique automatique des CSV** |
| **USB & Flash** | Programmation par câble d'une carte **Arduino** (.hex) **ou ESP32/S3/C3** (.bin, protocole esptool, vérification MD5) avec **moniteur de flash** et aperçu du **montage** ; moniteur série (CDC, CH340, CP210x, FTDI) |
| **Patricia** | Assistante (texte et **voix**) : crée tes projets avec montage et code, flashe un worker puis **lit le moniteur** pour dire si ça marche, diagnostique les erreurs, garde notes et historique, propose des améliorations ; IA locale (Ollama) ou en ligne facultative. Voir [docs/PATRICIA.md](docs/PATRICIA.md) |
| **Studio APK** | Crée ton application Android **sans coder**, façon App Inventor : écrans, glisser-déposer, variables reliées aux capteurs, blocs « quand… alors… », voix, joystick. Le Pi l'assemble et la signe **sans compiler** puis donne le **lien direct**, le **QR** et une appli web. Voir [docs/STUDIO_APK.md](docs/STUDIO_APK.md) |
| **Flotte de véhicules** | Jusqu'à 9 voitures (`firmware/vehicle/`) sur une arène : envoi par clic, formations, joystick, réservation de cases anti-collision, **arrêt général** (Espace). Validé en simulation seulement |
| **Réglages** | Système, configuration complète, mise à jour OTA (Internet ou fichier), scan réseau, journal filtrable, thème, raccourcis |

À tout moment : **Ctrl K** (ou `/`) ouvre la recherche universelle (pages, actions, capteurs, projets), thème clair/sombre, installable comme une application. Ouvrir `firmware/master/www/index.html?demo` affiche l'interface complète **en mode démonstration**, sans matériel.

Pour utiliser des workers sur des voitures, consultez [docs/SECURITE_VEHICULES.md](docs/SECURITE_VEHICULES.md) avant tout essai : le Wi‑Fi seul ne garantit pas l’évitement de collision. Le superviseur de flotte n'a été validé qu'en simulation.

## Raspberry Pi 4 et deux cartes SD

Le Pi démarre sur la clé USB 8 Go et garde sa microSD de 64 Go pour les projets, firmwares et builds. Le S3 garde sa microSD de 2 Go contenant la copie autonome `SD_CARD/` avec fichiers `.bin`, `.hex`, montages et explications. Les cartes restent dans leurs appareils; le S3 accède au Pi par Wi-Fi, et le Pi compile les projets. Le S3 reste maître des workers et autorise chaque flash. Guide des deux cartes, installation, APK et QR : [docs/ARCHITECTURE_S3_PI.md](docs/ARCHITECTURE_S3_PI.md).

Le **Studio APK** fabrique désormais les APK de projet directement sur le Pi, sans compilation, à partir de l’APK NEXUS 1.2 ([docs/STUDIO_APK.md](docs/STUDIO_APK.md)). L’APK dans la livraison est l’enveloppe mobile générale. Une APK personnalisée se construit à partir d’un export Studio avec `scripts\build_project_apk.bat`, puis `scripts\publish_project_apk.bat` la dépose sur le Pi et crée un QR LAN. Le Pi 4 ARM64 ne compile pas cette APK avec le modèle Android Gradle x86_64 du projet.

## Démarrage rapide

1. **MASTER** — `docs/INSTALLATION.md` : `idf.py build flash monitor` (ESP-IDF 6.1, ESP32-S3 N16R8). Notez les identifiants affichés au premier démarrage. Pas envie de compiler ? Les binaires prêts à flasher sont dans `firmware/master/prebuilt/`.
2. **microSD** (FAT32) — `python scripts/prepare_sd.py` puis copiez `SD_CARD/` à la racine de la carte.
3. **Workers** — ouvrez `firmware/worker/worker.ino` dans l'Arduino IDE (cœur esp32 3.3.x), téléversez sur chaque ESP32.
4. Connectez votre téléphone au Wi-Fi **ESP32-LAB** : le tableau de bord s'ouvre tout seul (portail captif), sinon `http://192.168.4.1`.

## Arborescence

```
firmware/master/        MASTER ESP32-S3 (ESP-IDF 6.1) — main/ (C), www/ (interface), tools/
firmware/worker/        Worker Arduino (un seul programme pour les 10 cartes)
firmware/vehicle/       Firmware des voitures pilotées par Patricia (NXV1, HMAC, dead-man)
pi/patricia/            Patricia : mémoire, diagnostic, intentions, IA, flotte, voix
pi/appstudio/           Studio APK : manifeste binaire, signature, fabrique d'APK, appli web
mobile/                 APK NEXUS (interface, micro natif, lecteur des applis du Studio APK)
catalog/                Source du catalogue : cartes, bibliothèques, modules, générateur, projets
  src/                  modules par famille + générateur de code (partagé navigateur/Node)
  classics/             49 programmes écrits à la main
  build.js              génère projects/LIBRARY, catalog.json, www/catalog.js
projects/LIBRARY/       320 projets générés (.ino + README + project.json)
SD_CARD/                arborescence prête à copier sur la microSD (générée)
scripts/                build, flash, diagnostic Windows, vérification, compilation des projets
docs/                   installation, montage, architecture, API, protocoles, OTA, USB, dépannage
```

## Vérification

`python3 scripts/nexus.py` pilote tout le labo en ligne de commande (Patricia, notes, génération sans compilation, jobs, APK, montages, flotte), voir [docs/STUDIO_VARIABLES.md](docs/STUDIO_VARIABLES.md). `python scripts/verify.py` contrôle la cohérence du dépôt (catalogue, générateur, interface, routes API, protocole, versions). `node scripts/bench_selftest.js` rejoue les scénarios du banc fantôme sur le code généré, sans matériel. **`scripts/compile_all.bat`** (ou `python scripts/compile_all.py`) compile tous les projets pour ESP32/S3/C3 et Arduino, range les `.bin`/`.hex` dans les dossiers des projets et recopie vers `SD_CARD/`. `python scripts/compile_projects.py` compile les projets avec arduino-cli.

État du firmware de base (rapport du 26/09/2026; vérifier les scripts avant tout flash) :
- MASTER : compilé avec ESP-IDF 6.1 / GCC 15, **0 avertissement**, binaire 1,5 Mo (75 % de la partition libre).
- Worker : compilé ESP32 et ESP32-S3 avec Arduino-ESP32 3.3.12, 0 avertissement.
- Projets : voir `docs/RAPPORT_COMPILATION.md`.
- Non testé sur matériel réel : câblage et comportement des capteurs à valider sur votre banc.

Licence MIT.
