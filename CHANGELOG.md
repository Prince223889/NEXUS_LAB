# Journal des versions

## 6.1.0 — ajouts du 01/10/2026

### Carte branchée sur l'USB du S3
- **Identification automatique** à chaque branchement (et bouton « Identifier à nouveau », `POST /api/usb/detect`) : ESP32 / ESP32-S3 / ESP32-C3 par le bootloader ROM, sinon Arduino par le bootloader STK500 (profil et signature). Résultat `usb.detect` dans `/api/system/info`, `/api/usb/serial`, `/api/usb/flash/status`.
- **Bon firmware proposé** : firmware **worker** complet pour un ESP32 (nouveau : `scripts/compile_all.py` compile `firmware/worker` pour chaque carte dans `SD_CARD/FIRMWARE/WORKER/<carte>/worker.bin` + `flash_args`), projet `.hex` avec le bon profil pour un Arduino. Affiché aussi dans « Cartes branchées » ; Patricia : « flashe la carte USB [avec …] ».

### Veille du labo (option espion)
- Nouveau module `veille.c` et page **Système › Veille du labo** : alerte si un appareil inconnu rejoint le Wi-Fi du box (adresses MAC des clients du point d'accès, workers reconnus tout seuls, appareils marqués « C'est à moi »), si un worker s'éteint ou revient, ou si une alarme de capteur se déclenche (règles « flux > seuil », 8 au plus, préréglages). Journal, bandeau « Veille active » visible sur toutes les pages, notification téléphone et WhatsApp/webhook. Réglages gardés en NVS. Rien n'est écouté, filmé ni intercepté.
- Patricia : « active / arrête la veille », « mode espion », et refus de surveiller une personne.

### Interface
- Grilles sans débordement horizontal sur téléphone (page USB & Flash).

## 6.1.0 — 29/09/2026

### Flash par câble et montages
- **Programmation ESP32 / ESP32-S3 / ESP32-C3 par câble USB** depuis le MASTER (protocole du bootloader ROM d'Espressif : SLIP, détection de puce, SPI_ATTACH/SET_PARAMS, écriture par blocs de 1 Ko, **vérification MD5** de chaque zone, reset DTR/RTS ou USB-JTAG). La page « USB & Flash » gère désormais Arduino **et** ESP32, avec **moniteur de flash** (étapes, pourcentage, journal en direct) puis ouverture automatique du moniteur série au bon débit. Refus si la puce ne correspond pas au firmware choisi.
- **Schémas de montage** générés pour chaque projet et chaque carte (`montage*.svg`, `MONTAGE.md`), affichés dans la fiche projet, la page Fichiers (aperçu d'un `.bin`/`.hex`) et avant chaque flash. Nouveau module `catalog/src/14_montage.js`.
- **`scripts/compile_all.py`** + **`scripts/compile_all.bat`** : compilent tous les projets pour ESP32/S3/C3 et Arduino, rangent les binaires dans `projects/LIBRARY/<projet>/bin/<carte>/` (avec `flash_args`) et `capteurs/<projet>/<projet>.hex`, recopient vers `SD_CARD/`. Incrémental, installation des bibliothèques manquantes, rapport `build/compile_all_report.md`.

### Workers
- **Sept nouveaux jobs « matériel »** sur chaque worker, sans bibliothèque externe : `ADC_READ` (voltmètre ADC1), `GPIO_TEST` (broches libres / tenues à GND / à 3V3 par tirage interne), `ONEWIRE_SCAN` (recherche ROM 1-Wire en bit-bang + température DS18B20), `LOGIC_SAMPLE` (analyseur logique 20 kHz : fréquence et rapport cyclique), `PWM_GEN` (générateur 1 kHz/50 %/10 s), `SERVO_SWEEP` (servo 0-180-0) et `TONE_TEST` (buzzer 200→4000 Hz). Broches et réglages dans `firmware/worker/config.h`, limitées aux broches sûres ; broches relâchées à la fin, à l'annulation et au dépassement de délai. Acceptés par le MASTER (`job_type_valid`), proposés dans la fiche worker, la création de job, les actions groupées (lecture seule), la page locale du worker, l'assistant (« voltmètre », « test gpio », « 1-wire », « analyseur logique ») et le mode démonstration.
- **Moniteur en direct par worker** (journal UDP 4212) et **panneau GPIO** (lecture niveau/tension, écriture, PWM) dans le tiroir d'un worker. Nouvelles routes `/api/worker/log` et `/api/worker/gpio` ; côté worker, API `/api/gpio` (broches sûres uniquement).
- **Flash d'un worker par Wi-Fi** repensé : choix du projet avec recherche, aperçu du montage, moniteur de progression. Progression OTA journalisée par le worker.

### Mises à jour par GitHub
- **Recherche des mises à jour sur un dépôt GitHub** (`utilisateur/depot`) : le MASTER lit la dernière **Release**, prend le tag comme version et le fichier `*master*.bin` comme firmware, envoie une **alerte WhatsApp/webhook**, et installe après approbation dans la page web (CallMeBot étant à sens unique). Les autres `.bin` de la Release (workers) sont proposés au téléchargement. Champ `github_repo` dans la configuration.

### Notifications
- Encodage correct du numéro WhatsApp (le `+` n'est plus transformé en espace), format du message **adapté au service** (Discord, ntfy, Telegram, Slack…), et **aide intégrée** dans les réglages (obtenir la clé CallMeBot, choisir un webhook). Le test de notification renvoie le détail (codes WhatsApp/webhook).

### Divers
- Téléchargement microSD avec `inline=1` (type MIME correct pour afficher les montages).
- Version portée à **6.1.0**.

## Non publié — Wireshark du Labo

### Nouveautés
- **Wireshark du Labo** : nouvelle page « Réseau » qui décode en direct les trames du labo (mesures `LAB|`, battements, `HELLO`/`ASSIGN`/`APP`/`DISCOVER`, journaux, `LAB|HOME`, HTTP sortant), avec **gigue et perte par worker**, filtres protocole/worker, pause et export CSV. La capture est **explicite** (armée depuis l'UI, désarmée au démarrage, coût nul tant qu'elle ne l'est pas) et n'observe que le trafic du labo.
- MASTER : module `netmon.[ch]` (anneau de 128 trames en PSRAM, métriques par worker), routes `GET /api/netmon` et `POST /api/netmon/arm`, résumé `netmon` dans `/api/state` et le WebSocket. Récepteurs UDP instrumentés d'une ligne (`worker_pool.c`, `telemetry.c`) sans changement de comportement ; `rx_task`/`log_task` passent désormais l'IP source.
- Interface : page `42_netmon.js` + simulation complète en mode démonstration.

## Non publié — Banc fantôme

### Nouveautés
- **Banc fantôme** : un worker « émulateur » imite les capteurs d'un projet (DAC, sorties numériques, esclave I2C générique) et observe ses actionneurs (niveau, rapport cyclique) pendant qu'un worker « DUT » exécute le projet. Le MASTER déroule un scénario dont les résultats attendus sont déduits des règles, vérifie aussi les mesures UDP 4213 du DUT et la robustesse à un composant I2C débranché, puis écrit un rapport dans `/sd/REPORTS/BENCH`.
- Catalogue : descripteurs `emu`/`obs` sur 25 modules, `LAB.benchPlan()` (`catalog/src/12_bench.js`), `bench.json` dans les 25 projets émulables, variantes de firmware « banc » (`compile_projects.py --bench`).
- Worker : routes `/api/emu/*`, état `EMULATING`, broches de banc déclarées dans `config.h` et annoncées par `/api/capabilities`.
- MASTER : module `bench.[ch]`, routes `/api/bench/run|status|stop`, résumé `bench` dans `/api/state` et le WebSocket.
- Interface : tiroir « Banc fantôme » depuis la bibliothèque et le Studio (câblage, scénario, suivi en direct), simulation complète en mode démonstration.
- `scripts/bench_selftest.js` : vérifie l'oracle contre le code réellement généré (`lab_rules()` transpilé en JavaScript) ; intégré à `verify.py`.

### Corrections
- Le générateur « retour au mode worker » (option `home`) n'existait que dans des copies de `www/src/` : reporté dans `catalog/src/`, source canonique. Ces copies (`catalog.js`, `10_generator.js`, `00_boards.js`) étaient concaténées dans `app.js` et écrasaient le catalogue ; elles sont déplacées dans `www/_anciennes_copies/`.

## 6.0.0 « NEXUS » — 26/09/2026

### Corrections (bugs de la 5.2.0)
- **Tous les jobs échouaient** : l'analyse des battements décalait les champs (RAM libre ignorée) et `strtok_r` fusionnait les champs vides. Nouveau découpage qui conserve les champs vides.
- Réponses HTTP des workers toujours vides (`perform()` puis `read_response()`) : lecture corrigée avec `open/write/fetch/read`.
- Programmeur Arduino : pages de 256 octets au lieu de 128 et accusé de `load_address` jamais lu → écritures décalées. Protocole STK500 réécrit avec vérification de chaque réponse et relecture complète.
- Tampons de 8 Ko sur une pile HTTP de 4 Ko (plantages aléatoires) ; pile du serveur portée à 16 Ko, gros tampons alloués dynamiquement.
- JSON non échappé (noms de fichiers, messages) ; `%u` avec `uint32_t`.
- Noms longs FAT désactivés (projets tronqués) ; mode PSRAM faux pour le N16R8 (octal) ; console secondaire USB-JTAG en conflit avec l'USB hôte.
- Worker : casse de `WiFiUdp.h` (échec sous Linux/macOS), dossier Arduino mal nommé, `CHECKUP` refusé, variables partagées non protégées, battement envoyé avant l'attribution du numéro.
- Projets 36 à 70 : simples coquilles vides → remplacés par des programmes complets.
- Suppression de l'astuce `-Wno-error` inefficace après `project()` ; CI réécrite avec l'action officielle.

### ESP-IDF 6.1
- Compilation sans aucun avertissement avec GCC 15 ; dépendances figées (`~`) : cJSON 1.7.19, mDNS 1.13, led_strip 3.0, usb 1.5, cdc_acm 2.4, ch34x 2.2, cp210x 2.2, ftdi 2.1.
- SHA-256 via PSA Crypto ; OTA avec retour arrière ; bundle de certificats ; WebSocket.

### Nouveautés
- **Interface web entièrement refaite**, PC et téléphone : tableau de bord temps réel (WebSocket), workers, jobs, capteurs en direct avec alertes et traceur, bibliothèque, Studio, outils, fichiers, USB, assistant, réglages ; recherche Ctrl K, thème sombre, mode démonstration, installable (PWA).
- **Studio** : génération de programmes complets à partir de modules, attribution automatique des broches, automatismes avec hystérésis ou commande proportionnelle, page web, envoi au MASTER, MQTT, budget énergie, partage par lien, export ZIP, enregistrement sur la microSD.
- **Catalogue de 320 projets** : 219 capteurs/modules (17 familles), 52 projets complets, 49 classiques ESP32, pour ESP32, ESP32-S3 et ESP32-C3, bibliothèques aux versions validées.
- Outils : brochage interactif, carte des adresses I2C, budget énergétique, résistance de LED, pont diviseur, code couleur, PWM, ADC, fuseaux POSIX, convertisseur de bases.
- MASTER : portail captif, mDNS, reconnexion Wi-Fi progressive, SNTP et fuseau, scan Wi-Fi avec conseil de canal, réception des mesures UDP 4213, journal d'événements, rapports horaires, noms des workers, OTA des workers, USB CH34x/CP210x/FTDI, moniteur série, notifications webhook, bouton BOOT (3 s identifiants, 10 s réinitialisation), anti force brute.
- Worker : jobs `I2C_SCAN`, `WIFI_SCAN`, `MEM_TEST`, `IDENTIFY`, page d'état, compteur de jobs.
- Scripts : `verify.py` (86 contrôles réels), `compile_projects.py`, `prepare_sd.py`, `make_release.py`, diagnostic Windows.
