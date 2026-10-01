# Patricia : l'assistante du labo

Patricia vit sur le Raspberry Pi (`pi/patricia/`) et s'affiche dans l'interface du S3 (écran **Patricia**, bouton flottant en bas à droite, ou `Ctrl K` → « Patricia »). Elle fonctionne **sans Internet** ; une IA locale (Ollama) ou en ligne la rend plus bavarde et plus souple, mais n'est jamais obligatoire.

## Ce qu'elle sait faire

| Demande (exemples) | Ce qui se passe |
|---|---|
| « Je veux faire une station météo avec un BME280 et un écran OLED » | Projet créé dans sa mémoire, **montage** (schéma), **code** généré, bibliothèques, conseils ; boutons Studio, `.ino`, enregistrer sur le Pi |
| « Flash », « Flashe la station météo sur W3 » | Sans précision : le projet ouvert dans le **Studio**, sur le premier worker libre. Compilation sur le Pi → flash du worker → **lecture du moniteur** et verdict (ça marche / échec / incertain). Part tout de suite ou après validation, selon le réglage |
| « Compile », « compile la serre pour S3 » | Compilation sur le Pi (le projet du Studio est d'abord enregistré sur le Pi) ; une erreur est lue et expliquée |
| « Qui es-tu ? », « tu es quoi pour moi ? » | Toujours la même réponse chaleureuse : sa partenaire de labo, amie et complice de tes projets (une IA, pas une petite amie) |
| « Quelles cartes sont branchées ? », « fais un check-up de toutes les cartes » | Bilan : MASTER, workers sur le Wi-Fi (signal, puce, mémoire), carte sur l'USB du S3, cartes série sur l'USB du Pi, liaison Pi ↔ S3 ; check-up de chaque worker en ligne. Même bilan dans **Système › Cartes branchées** |
| « Crée un dossier serre », « crée un fichier serre/notes.txt avec : … », « liste mes fichiers », « lis le fichier … », « supprime le dossier essais » | Dossiers et fichiers dans tes projets sur le Pi (`MY_PROJECTS`) ; une suppression part dans `.corbeille`, un fichier remplacé y garde son ancienne version |
| « Crée un dépôt github mon-robot » | Nouveau dépôt sur ton compte (README initial), privé par défaut |
| « Analyse mon projet », « corrige les erreurs de serre » | Analyse du code (voir plus bas) et correction automatique avec copie de sauvegarde |
| « Lance un voltmètre sur W2 », « fais un test des broches », « lance un scan 1-wire » | Nouveaux jobs des workers : voltmètre, test des broches, 1-Wire, analyseur logique, générateur PWM, balayage servo, test buzzer |
| « Flashe la carte USB », « installe le worker sur la carte USB », « flashe la carte USB avec bme280 » | La carte branchée sur l'USB du S3 est identifiée (ESP32, S3, C3 ou Arduino) ; un ESP32 reçoit le **firmware worker** (il rejoint le Wi-Fi du S3), un Arduino le projet nommé ; flash, vérification MD5 puis moniteur série dans **USB & Flash** |
| « Active la veille », « mode espion », « arrête la veille », « qu'est-ce que la veille a vu ? » | **Veille du labo** : alerte si un appareil inconnu rejoint le Wi-Fi du box, si un worker s'éteint ou si une alarme de capteur se déclenche ; journal dans **Système › Veille du labo**. Elle refuse de surveiller une personne (messages, appels, caméra) et propose la veille à la place |
| « Quelle est la température ? », « Lis les capteurs du worker 2 » | Dernières mesures envoyées au MASTER par les workers et les montages, filtrées par grandeur ou par worker ; signale les mesures qui ne se mettent plus à jour |
| « Vérifie W3 » | Lit le journal du worker (et le port USB si tu es admin) et explique ce qu'il voit |
| Coller une erreur de compilation ou un moniteur série | Diagnostic : bibliothèque manquante (installation proposée), mauvaise carte, API LEDC 3.x, brownout, Guru Meditation, watchdog, boucle de redémarrage, capteur absent, I2C… |
| « Note : commander des résistances 2 kΩ », « Rappelle-toi que ma carte est un S3 » | Notes et faits gardés en mémoire, recherche plein texte |
| « Où en est mon arrosage ? », « Améliore mon projet » | Historique du projet, prochaine étape, idées d'amélioration (elle demande si tu veux les appliquer) |
| « Lance un check-up sur tous les workers » | Job S3 proposé, exécuté après confirmation |
| « Fais-moi une APK pour la serre », « une APK avec un DHT22 et un relais », « crée l'APK » | Le Pi crée l'application (une valeur et une courbe par mesure, un bouton par actionneur) à partir du projet nommé, des capteurs cités ou du projet du Studio, et répond avec le lien direct et le QR ; à personnaliser dans le **Studio APK** ([STUDIO_APK.md](STUDIO_APK.md)) |
| « Voiture 2 va en 1,5 2 », « toutes les voitures en ligne », « stop » | Pilotage de la flotte (voir plus bas). **« stop » / « arrête tout » est immédiat**, sans confirmation |

### Agir directement ou demander de valider

Réglages → **Quand je dis « flash » ou « compile »** :

- **Patricia agit directement** (par défaut) : flash, compilation, APK, jobs et check-up, nouveaux dossiers et nouveaux fichiers partent dès qu'elle a compris. Pour un flash, la fenêtre du flash s'ouvre et enchaîne seule (worker, montage, compilation, OTA, moniteur).
- **Patricia me demande de valider** : chaque action arrive avec Confirmer / Annuler (valable 5 minutes).

Dans les deux cas, restent **toujours à confirmer** : l'envoi sur GitHub et la création d'un dépôt, la suppression ou le remplacement d'un fichier, la correction automatique de ton code et le déplacement des voitures. « stop » / « arrête tout » est immédiat. Patricia ne lance jamais la compilation complète des 320 projets.

### Qui est Patricia

Patricia est une IA : l'assistante et la complice de ton labo. À « qui es-tu ? » ou « tu es quoi pour moi ? », elle répond toujours de la même façon, avec chaleur : ta partenaire de labo, ton amie pour tes projets. Elle ne joue pas le rôle d'une petite amie.

### Comme une IA en ligne

Sans Internet, Patricia comprend les demandes du labo ci-dessus (règles en français) et cherche dans le catalogue et sa mémoire. Pour discuter de tout, comme avec ChatGPT ou Claude, branche une IA dans Réglages → IA : un modèle local avec Ollama (gratuit, plus lent et moins fin sur un Pi 4) ou un service en ligne au format « chat/completions » avec ta clé. L'IA reçoit les mêmes outils (catalogue, mémoire, fichiers, analyse, cartes branchées, actions) et passe par les mêmes règles de validation.

## Veille du labo (« option espion »)

La veille tourne sur le MASTER (elle marche sans le Pi) et ne surveille que **ton** matériel :

- **Wi-Fi du box** : chaque appareil associé au point d'accès du S3 est listé (adresse MAC). Les workers sont reconnus tout seuls ; marque tes appareils (téléphone, Pi, PC) avec « C'est à moi ». Pendant la veille, un appareil inconnu déclenche une alerte.
- **Workers** : alerte quand un worker s'éteint ou revient.
- **Alarmes de capteurs** : « si atelier · pir > 0,5 alors alerte », sur les mesures envoyées par tes montages (préréglages mouvement, porte, gaz, fuite d'eau, température).

Chaque alerte va dans le journal, le bandeau « Veille active » en haut de toutes les pages, une notification sur le téléphone (vibration + voix dans l'appli NEXUS) et WhatsApp/webhook si configuré. Rien n'est écouté, filmé ni intercepté : la veille ne capte aucun trafic et ne voit que les adresses des appareils connectés au box.

## Voix

- **APK NEXUS** (Android) : micro et synthèse natifs du téléphone, hors ligne si le pack français est installé. Autorisation micro demandée au premier appui.
- **Navigateur** : la reconnaissance vocale du navigateur n'existe qu'en HTTPS ; sur `http://192.168.4.1` Patricia enregistre le micro et l'envoie au Pi (Vosk) si `--voice` est installé.
- Appui long sur le bouton flottant = parler directement. Mode « mains libres » dans l'écran Patricia.
- **Réglages → Voix activée** : décoché, Patricia ne parle plus et répond seulement par écrit. Le curseur « Débit » ralentit ou accélère la voix (0,95 par défaut, un débit posé ; le style « complice » parle encore un peu plus doucement).
- **Réglages → Voix** : « Automatique » prend la voix la plus naturelle disponible, sinon tu choisis dans la liste (voix du téléphone ou du navigateur, la plus naturelle en tête, plus « Voix du Pi (Piper, hors ligne) » si Piper est installé). Bouton **Écouter** pour comparer.
- Sur le Pi (Piper), `NEXUS_PIPER_SPEED` règle la lenteur de base (1,08 par défaut ; plus grand = plus lent) et `NEXUS_PIPER_PAUSE` la pause entre deux phrases (0,25 s).

### Une voix naturelle

Patricia ne fabrique pas sa voix : elle utilise la meilleure voix française du moteur disponible, de préférence féminine, à hauteur normale (une voix montée dans les aigus sonne métallique). Avant de parler, elle enlève le markdown, les émojis, le code et les liens, dit les unités en mots (« 45 degrés », « 3,3 volts », « worker 3 ») et lit phrase par phrase avec de courtes pauses.

- **PC** : Microsoft Edge et ses voix « Natural » (Denise, Eloise, Vivienne…) — les plus humaines, mais elles passent par Internet.
- **Android / Chrome** : la voix Google française (paramètres Android → Synthèse vocale → moteur Google, données « Français (France) » ; une voix « réseau » est utilisée quand Internet répond, sinon la meilleure voix installée hors ligne).
- **Hors ligne sur le Pi** : Piper avec la voix siwis (`sudo bash pi/setup_patricia.sh --voice`), choisie automatiquement quand le navigateur n'a pas de voix naturelle.

Honnêtement : les voix hors ligne (Piper, voix locales du téléphone) sont bonnes mais pas parfaites — une intonation parfois plate ou un mot technique mal prononcé. Les anciennes voix Windows (Hortense, Paul) et eSpeak sous Linux restent robotiques : préfère Edge, Chrome ou Piper.

## Personnalité

Réglages → **Personnalité** :

| Style | Comportement |
|---|---|
| **Scientifique** (par défaut) | Neutre et pédagogue : explique pas à pas, donne le pourquoi, corrige les erreurs avec douceur. |
| **Complice** | Même pédagogie, plus chaleureuse : te taquine sur tes erreurs, t'encourage, te pose parfois une question personnelle légère. Voix un peu plus posée. |

Le style est gardé dans sa mémoire (fait « style de patricia »). Même en mode complice, elle reste sobre pour l'arrêt d'urgence, le pilotage des voitures, le flash et les diagnostics, et n'a jamais de contenu sexuel.

## Envoyer un projet sur GitHub

1. Sur github.com : *Settings › Developer settings › Fine-grained tokens › Generate new token*, accès à « All repositories », droits **Administration** (lecture et écriture, pour créer un dépôt) et **Contents** (lecture et écriture).
2. Dans Patricia › Réglages › **GitHub** : colle le jeton, choisis éventuellement une organisation et si les nouveaux dépôts sont privés (oui par défaut).
3. Dis ou écris : « envoie la serre sur GitHub », « crée un dépôt github pour station_meteo », « pousse mon projet sur GitHub en public ». Pour un dépôt vide : « crée un dépôt github mon-robot ». Tout dossier créé par Patricia dans tes projets peut être envoyé de la même façon.

Patricia propose l'envoi et attend ta confirmation. Elle crée ensuite le dépôt s'il n'existe pas et y dépose en un seul commit le code, le montage, la fiche et le README du projet. Les binaires (`bin/`) ne sont pas envoyés. Le jeton reste sur le Pi, dans `/srv/nexus/patricia/github.json` (droits 0600), et n'est jamais renvoyé à l'interface. Le Pi a besoin d'Internet : Wi-Fi amont du S3 ou Ethernet.

## Analyse et correction des projets

`pi/patricia/analyzer.py` relit les fichiers `.ino`, `.h`, `.hpp`, `.c` et `.cpp` d'un projet (par ex. `/srv/nexus/projects/MY_PROJECTS/<id>/`) sans rien compiler. La carte vient de la demande, sinon de `project.json` (`board`, `fqbn` ou `spec.board`), sinon ESP32. Chaque constat a une gravité (grave / à surveiller / info), un fichier, une ligne et une note sur 100 pour le projet. Les commentaires et le texte entre guillemets sont ignorés.

| Vérification | Identifiant | Correction automatique |
|---|---|---|
| `Serial.print…` sans `Serial.begin` | `missing-serial-begin` | `Serial.begin(115200);` en première ligne de `setup()` |
| `digitalWrite`/`analogWrite` sans `pinMode(…, OUTPUT)` | `missing-pinmode` | `pinMode(broche, OUTPUT);` dans `setup()` |
| `ledcWrite(broche, …)` sans `ledcAttach` | `missing-ledcattach` | `ledcAttach(broche, 5000, 8);` dans `setup()` |
| Bibliothèque utilisée sans son `#include` (DHT, Wire, WiFi, ESP32Servo, NeoPixel, OneWire, DallasTemperature, LiquidCrystal_I2C, SSD1306 + GFX ; `Arduino.h` dans un `.cpp`) | `missing-include` | ajoute l'`#include` en haut du fichier |
| `#include <Servo.h>` (AVR seulement) | `servo-header` | remplacé par `ESP32Servo.h` |
| Bus I2C utilisé sans `Wire.begin()` | `missing-wire-begin` | `Wire.begin();` dans `setup()` |
| Ancienne API LEDC 2.x (`ledcSetup` + `ledcAttachPin`) | `ledc-api-v3` | `ledcAttach(broche, f, r)` et `ledcWrite(broche, …)`, seulement si la correspondance canal → broche est sans ambiguïté |
| `setup()` ou `loop()` absente | `missing-setup`, `missing-loop` | ajoute une `loop()` vide (si seule `loop()` manque) |
| Broche inexistante, broche de la flash (ESP32 6-11, S3 26-32, C3 12-17), sortie sur une entrée seule (ESP32 34-39), ADC2 lu avec le Wi-Fi actif, broche de démarrage | `pin-invalid`, `pin-flash`, `pin-input-only`, `pin-adc2-wifi`, `pin-strapping` | non : il faut recâbler |
| `delay()` d'une seconde ou plus dans `loop()` avec un serveur web | `blocking-delay` | non |
| Accolades ou parenthèses déséquilibrées | `unbalanced-braces`, `unbalanced-parens` | non (ligne approximative) |
| `WiFi.begin("your_ssid", …)` et autres noms d'exemple | `wifi-placeholder` | non |
| Jeton ou clé d'API écrit en clair (`ghp_…`, `sk-…`, longues clés) | `hardcoded-secret` | non |

Si un journal de compilation est fourni, les constats du diagnostic (`diagnose.py`) s'y ajoutent ; « 'DHT' does not name a type » devient un `#include` manquant corrigeable, un en-tête introuvable devient `missing-library` (installation à confirmer).

**Sauvegarde.** Avant toute correction, Patricia copie les fichiers d'origine dans `<projet>/.patricia_backup/<date-heure>/`. « Annule les corrections » remet la dernière sauvegarde (ou celle qu'on nomme). Elle ne modifie que des fichiers texte du dossier du projet, ne suit jamais un lien symbolique et ignore les fichiers de plus de 512 Ko. Relancer les corrections sur un projet déjà corrigé ne change plus rien.

## Installation sur le Pi

`pi/install.sh` installe Patricia avec l'agent. Options :

```bash
sudo bash pi/setup_patricia.sh --ollama            # IA locale qwen2.5:1.5b (≈1 Go sur la microSD 64 Go)
sudo bash pi/setup_patricia.sh --voice             # Vosk (reconnaissance FR) + Piper (voix FR)
sudo bash pi/setup_patricia.sh --fleet             # génère NEXUS_FLEET_KEY pour les voitures
```

Variables dans `/etc/nexus/nexus.env` : `NEXUS_AI_ENDPOINT`, `NEXUS_AI_MODEL`, `NEXUS_AI_KEY` (IA), `NEXUS_PATRICIA_DB` (mémoire SQLite, sauvegardée chaque jour dans `BACKUPS/PATRICIA`, 14 copies), `NEXUS_FLEET_KEY`, `NEXUS_ARENA_W/H/CELL`, `NEXUS_VOSK_MODEL`, `NEXUS_PIPER`, `NEXUS_PIPER_VOICE`.

Sans Pi joignable, l'écran Patricia retombe sur l'ancien assistant du S3 (état du labo, câblage du catalogue).

## Flotte de voitures (jusqu'à 9)

1. Monte un ESP32 sur chaque voiture : pont en H, HC-SR04 avec pont diviseur, codeurs de roues conseillés, bouton d'arrêt, **coupe-circuit sur la batterie**.
2. Dans `firmware/vehicle/config.h` : `VEHICLE_ID` unique (V1…V9), `FLEET_KEY` = `NEXUS_FLEET_KEY` du Pi, broches. Téléverse `vehicle.ino` (Arduino-ESP32 3.x).
3. Écran **Flotte de véhicules** : chaque voiture s'annonce → « Placer » à sa position réelle → clic sur une case pour l'envoyer.

Sécurité, dans l'ordre où elle agit :

- **Sur la voiture** : arrêt si aucun ordre valide depuis 800 ms, obstacle < 15 cm, perte du Wi-Fi ou bouton d'arrêt (verrouillé jusqu'à « Lever l'arrêt »). Ordres signés HMAC, rejeu refusé.
- **Sur le Pi** : arène en cases, chaque voiture réserve au plus 2 cases (la sienne et la suivante), trajets A*, blocage résolu par priorité (la moins prioritaire s'écarte ou attend), voiture muette = arrêtée et ses cases voisines bloquées, deux voitures trop proches = arrêt des deux, arrêt général (barre Espace).

Simulateur sans matériel : `python3 scripts/simulate_fleet.py --key "<NEXUS_FLEET_KEY>" --count 4`.

**Limites honnêtes** : la superviseur n'a été validé qu'en simulation (60 scénarios aléatoires à 9 voitures dans les tests, 0 collision) et le firmware véhicule n'a pas été compilé ni essayé sur une vraie voiture. La position vient de l'odométrie des roues, qui dérive : replace les voitures régulièrement. Lis [SECURITE_VEHICULES.md](SECURITE_VEHICULES.md) avant le premier essai.

## API (Pi, port 8088, jeton Bearer)

`GET /api/v1/patricia/hello`, `POST /api/v1/patricia/chat` (`q`, `session`, `context`), `POST /api/v1/patricia/actions/<id>/confirm|cancel|report`, `GET actions|history|memory|export|voice` (notes, projets et faits sont dans `memory`), `POST notes`, `notes/<id>`, `projects/<id>/delete`, `facts`, `followups/<id>`, `diagnose`, `verify`, `wipe`, `stt` (WAV), `tts`, `GET voice`.

Flotte : `GET /api/v1/fleet`, `POST /api/v1/fleet/register|remove|arena|goal|manual|estop|release`.

Tests : `python3 -m unittest discover -s pi/tests` (aussi lancé par `scripts/verify.py`).
