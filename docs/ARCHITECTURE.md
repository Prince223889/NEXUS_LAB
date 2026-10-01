# Architecture

## MASTER (firmware/master/main)

| Module | Rôle |
|---|---|
| `app_main.c` | ordre de démarrage : NVS → config → LED → journal → microSD → Wi-Fi AP+STA → DNS captif → mDNS → workers → jobs → télémétrie → USB → web → OTA → rapports → bouton BOOT |
| `lab_config.[ch]` | configuration en NVS, secrets générés aléatoirement au premier démarrage, validation (messages en français), réinitialisation usine |
| `wifi_lab.[ch]` | point d'accès + station, reconnexion avec délai croissant, SNTP, fuseau, scan asynchrone |
| `captive_dns.[ch]` | DNS du portail captif (toute requête → 192.168.4.1) |
| `worker_pool.[ch]` | découverte UDP 4211, attribution W1…W10 par MAC, battements, noms mémorisés en NVS, commandes HTTP vers les workers, OTA des workers |
| `job_engine.[ch]` | file de 32 jobs à priorités, ciblage, reprise automatique, annulation, statistiques, historique `/sd/REPORTS/jobs.csv` |
| `telemetry.[ch]` | historique 120 points (RAM, PSRAM, DHT, workers, jobs, RSSI), réception des mesures UDP 4213 (32 flux) |
| `event_log.[ch]` | journal circulaire de 96 événements + `/sd/LOGS/events.csv` |
| `storage.[ch]` | microSD FAT32 (noms longs), validation des chemins, arborescence standard, import de `/sd/INBOX` |
| `web_server.c` | serveur HTTP, ressources gzip embarquées, sessions admin (cookie HttpOnly, SameSite=Strict, anti-force brute), WebSocket `/ws` (état toutes les 2 s) |
| `web_api.c` | API REST (voir `API.md`) |
| `usb_avr.[ch]` | USB hôte : CDC-ACM, CH34x, CP210x, FTDI ; moniteur série ; programmeur STK500v1 |
| `ota_manager.[ch]` | OTA par manifeste HTTPS (SHA-256) ou par fichier, retour arrière automatique |
| `notifications.[ch]` | WhatsApp (CallMeBot) et webhook JSON |
| `agent.[ch]` | assistant : réponses locales, actions sûres, IA compatible OpenAI optionnelle |
| `reports.[ch]` | rapports JSON horaires et manuels dans `/sd/REPORTS` |
| `bench.[ch]` | banc fantôme : orchestre un worker émulateur et un worker DUT, rapport dans `/sd/REPORTS/BENCH` |
| `netmon.[ch]` | Wireshark du Labo : anneau de trames capturées (capture explicite) + perte/gigue par worker |
| `led_status`, `dht11`, `boot_button`, `http_util` | LED RGB, capteur d'ambiance, bouton BOOT, utilitaires HTTP |

Partitions (16 Mo) : 2 × 6 Mo OTA + 3,9 Mo de données. PSRAM octale 8 Mo utilisée pour les allocations > 4 Ko.

## Interface web (firmware/master/www)

- `index.html` (coquille), `app.css` (système de design, thèmes clair/sombre, 3 points de rupture 1200/980/640 px).
- `src/*.js` : sources de l'application, concaténées en `app.js` par `tools/bundle_www.py` pendant le build.
  - `10_core` : utilitaires, icônes SVG, API, toasts/modales/tiroirs, graphiques SVG, coloration C++, routeur, palette Ctrl K, WebSocket.
  - `20_live` : tableau de bord, workers, jobs, capteurs en direct.
  - `30_library` : bibliothèque, fiche projet, vue de brochage, export ZIP.
  - `35_studio` : Studio.
  - `38_bench` : tiroir « Banc fantôme » (câblage du banc, scénario, suivi en direct).
  - `42_netmon` : page « Réseau » (Wireshark du Labo : trames en direct, perte/gigue).
  - `40_tools` : outils et calculateurs.
  - `50_sys` : fichiers, USB, assistant, réglages.
  - `90_demo` : simulateur complet utilisé quand le MASTER est injoignable ou avec `?demo`.
- `catalog.js` : généré par `catalog/build.js` (modules, générateur, classiques).
- Tout est compressé en gzip au build et embarqué dans le firmware (≈ 190 Ko au total).

## Catalogue (catalog/)

Un module décrit un composant : broches requises (type : adc, io, pwm, uart_rx…), bus (I2C/SPI), adresses, bibliothèques et versions, code (`glob`, `setup`, `loop`), mesures publiées, actions possibles (on/off/toggle/set), consommation. Le générateur (`10_generator.js`) :

1. attribue les broches par ordre de rareté (DAC → tactile → ADC → UART → E/S) en évitant broches réservées et de strapping ;
2. détecte les conflits d'adresse I2C et les besoins d'alimentation ;
3. assemble un programme complet : lectures non bloquantes, sortie « clé:valeur » compatible Traceur série, règles avec hystérésis ou commande proportionnelle, page web, envoi UDP au MASTER, MQTT ;
4. produit câblage, consommation et avertissements.

Le même code tourne dans le navigateur (Studio) et dans Node (`build.js`).

**Banc fantôme** (`12_bench.js`) : à partir des descripteurs `emu` (capteur imitable : sortie analogique, numérique ou
registre I2C) et `obs` (actionneur observable : niveau ou rapport cyclique) des modules, `LAB.benchPlan()` produit le
câblage du banc et un scénario dont les résultats attendus sont déduits des règles (seuils, hystérésis, commande
proportionnelle, actif bas). `scripts/bench_selftest.js` vérifie cet oracle contre le code réellement généré, en
transpilant `lab_rules()` en JavaScript.
