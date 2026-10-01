# API REST du MASTER

Base : `http://192.168.4.1` (ou `http://esp32-lab.local`). Réponses JSON ; erreur = `{"error":"message"}` avec code HTTP.
Corps des POST : `application/x-www-form-urlencoded` sauf mention **JSON**. 🔒 = session administrateur requise (cookie `LABSESS` obtenu par le chemin de contrôle).

## Session et temps réel
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/session` | `{admin, version}` |
| POST | `/api/logout` | ferme la session |
| GET/POST | *chemin de contrôle* | page de connexion admin (5 essais puis blocage 60 s) |
| WS | `/ws` | état complet toutes les 2 s + nouveaux événements ; inclut `netmon{armed,total,worst_jitter}` |

## Wireshark du Labo
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/netmon?since=N` | `{armed, last, frames:[{seq,age_ms,dir,proto,worker,ip,len,summary}], metrics:[{worker,jitter_ms,loss,rx,last_ms}]}` — décodage des trames **du labo** (voir `PROTOCOLES.md`) |
| POST 🔒 | `/api/netmon/arm` | **JSON** `{on:bool}` : arme/désarme la capture (désarmée = coût nul ; l'arrêt vide l'anneau) |
| GET | `/api/link` | Liaison S3 → Pi (sondée toutes les 20 s) : `{pi, ok, rtt_ms, loss_pct, min_ms, max_ms, jitter_ms, samples, sent, lost, hello_age_s, last_ok_age_s, history[]}` (−1 = sonde perdue) |
| GET | `/api/link/hello?port=8088` | Annonce du Pi (réservée aux clients 192.168.4.2-254 du point d'accès) ; le S3 retient son adresse |

## État et système
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/state` | `master{…}`, `jobs{queued,running,success,failed}`, `workers[]`, `feeds[]`, `bench{…}` (résumé du banc), `veille{armed,last,count}`, `event_seq` |
| GET | `/api/health` | résumé court (supervision) |
| GET | `/api/system/info` | version, IDF, puce, flash, PSRAM, microSD, OTA, USB |
| GET | `/api/telemetry` | historique : `t[] heap[] psram[] temp[] hum[] workers[] jobs[] rssi[]`, `period_s` |
| GET | `/api/events?since=N` | événements `{seq,t,epoch,lv,src,msg}` |
| GET | `/api/selftest` | 10 vérifications `{name,ok,detail}` |
| GET | `/api/feeds` | mesures reçues des montages |
| POST | `/api/system/identify` | fait clignoter la LED |
| POST 🔒 | `/api/system/reboot` | redémarre |
| POST 🔒 | `/api/report/snapshot` | écrit un rapport sur la microSD |

## Jobs et workers
| Méthode | Route | Paramètres |
|---|---|---|
| GET | `/api/jobs` | liste `{id,type,priority,worker,target_worker,retries,status,progress,result,created_ms,started_ms,finished_ms}` |
| POST | `/api/job` | `type`, `priority` (1-100), `worker` (0 = automatique) |
| POST 🔒 | `/api/job/cancel` | `id` |
| POST 🔒 | `/api/jobs/cancel-all`, `/api/jobs/clear` | — |
| POST | `/api/fleet/job` | `type` → un job par worker en ligne |
| POST | `/api/fleet/ping`, `/api/fleet/benchmark` | — |
| POST 🔒 | `/api/fleet/reboot` | — |
| GET | `/api/worker/info?id=N` | infos détaillées relayées depuis le worker |
| GET | `/api/worker/scan?id=N[&start=1]` | scan Wi-Fi du worker |
| POST | `/api/worker/discover` | diffusion de découverte |
| POST 🔒 | `/api/worker/label` | `id`, `label` |
| POST 🔒 | `/api/worker/reboot`, `/api/worker/forget` | `id` |
| POST 🔒 | `/api/worker/flash` | `id`, `path` (fichier `.bin` sur la microSD) |

## Banc fantôme
| Méthode | Route | Description |
|---|---|---|
| POST 🔒 | `/api/bench/run` | **JSON** `{plan, bin, dut, emu}` : `plan` = `LAB.benchPayload()` (voies + étapes + résultats attendus), `bin` = firmware du DUT sur la microSD (variante « banc »), `dut`/`emu` = numéros de workers. 409 si un banc tourne déjà |
| GET | `/api/bench/status` | `{running, project, phase, step, steps, label, passed, failed, verdict, error, report, results[{i,label,ok,checks[]}]}` |
| POST 🔒 | `/api/bench/stop` | arrêt ; le nettoyage (émulateur arrêté, DUT renvoyé au mode worker) est toujours exécuté |

Rapport de chaque session : `/sd/REPORTS/BENCH/<projet>_<date>.json`. Protocole et format du plan : `PROTOCOLES.md`.

Types de job : `PING`, `SYSTEM_TEST` (alias `CHECKUP`), `BENCHMARK`, `FS_TEST`, `MEM_TEST`, `I2C_SCAN`, `WIFI_SCAN`, `IDENTIFY`, et les jobs « matériel » `ADC_READ`, `GPIO_TEST`, `ONEWIRE_SCAN`, `LOGIC_SAMPLE` (lecture seule) et `PWM_GEN`, `SERVO_SWEEP`, `TONE_TEST` (pilotent une broche).

Les jobs ne portent pas de paramètres : broches et réglages sont fixés dans `firmware/worker/config.h` (`WORKER_*_PIN`, fréquences, durées), et le worker refuse toute broche hors de sa liste de broches sûres (résultat `…=PIN_REFUSED`, job en échec). Résultats (`result` du job, 127 caractères max) :

| Job | Rôle | Réglages par défaut | Exemple de résultat |
|---|---|---|---|
| `ADC_READ` | voltmètre : moyenne de 16 mesures (mV) sur chaque broche sûre de l'ADC1 (ADC2 inutilisable avec le Wi-Fi) | — | `ADC mV N=6 32:1650 33:0 34:3301 …` |
| `GPIO_TEST` | tirage interne haut puis bas sur chaque broche sûre (hors LED et entrées seules) : libre, tenue à GND ou à 3V3 ; la broche repart en entrée | — | `GPIO_TEST PINS=17 FREE=15 GND=0 3V3=2 \| 3V3: 21 22` |
| `ONEWIRE_SCAN` | recherche ROM 1-Wire (sans bibliothèque) puis température des DS18B20/DS1822/DS18S20 ; échec si le bus est à 0 | ESP32 GPIO32, S3 GPIO13, C3 GPIO3 ; 8 composants max | `ONEWIRE GPIO=32 FOUND=1 : 28FF641E8316034B=21.5C` |
| `LOGIC_SAMPLE` | analyseur logique : fréquence (fronts montants) et rapport cyclique, `H`/`L` si constant | ESP32 GPIO33-36, S3 14/17/18/21, C3 0/1/3/10 ; 20 kHz pendant 1 s | `LOGIC RATE=20000Hz MS=1000 33:1000Hz/50% 34:L` |
| `PWM_GEN` | générateur de signal carré, broche relâchée ensuite | ESP32 GPIO13, S3 GPIO10, C3 GPIO10 ; 1 kHz, 50 %, 10 s | `PWM GPIO=13 FREQ=1000Hz REAL=1000Hz DUTY=50% MS=10000` |
| `SERVO_SWEEP` | servomoteur 0° → 180° → 0° (50 Hz, 500-2500 µs, pas de 5° toutes les 50 ms) | ESP32 GPIO27, S3 GPIO11, C3 GPIO10 | `SERVO GPIO=27 SWEEP=0-180-0 STEP=5deg PULSE=500-2500us` |
| `TONE_TEST` | buzzer passif : 20 paliers de 200 à 4000 Hz, 150 ms chacun | ESP32 GPIO14, S3 GPIO12, C3 GPIO10 | `TONE GPIO=14 SWEEP=200-4000Hz STEPS=20` |

Une broche tenue par `PWM_GEN`, `SERVO_SWEEP`, `TONE_TEST` ou `ONEWIRE_SCAN` est refusée par le panneau GPIO (`409 busy`) jusqu'à la fin du job ; annulation et dépassement de délai relâchent la broche.

## microSD et projets
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/sd/list?path=/sd/…` | `{path,admin,items[{name,type:'d'|'f',size,mtime}],total,free}` — hors admin : PROJECTS, FIRMWARE, COMPONENTS, TESTS, REPORTS, DATABASE |
| GET | `/api/sd/download?path=…[&inline=1]` | fichier (`inline=1` : affichage direct avec type MIME, pour montages .svg/.png) |
| POST 🔒 | `/api/sd/upload` | corps brut, en-tête `X-Path` (encodé URL), 8 Mo max → `{path,sha256}` |
| POST 🔒 | `/api/sd/mkdir`, `/api/sd/delete` | `path` |
| POST 🔒 | `/api/sd/rename` | `path`, `to` |
| GET | `/api/projects` | dossiers de projets |
| POST 🔒 | `/api/project/mkdir` | `name` |
| POST 🔒 | `/api/project/upload` | corps brut, en-têtes `X-Project`, `X-Filename` |
| POST 🔒 | `/api/project/import` | importe `/sd/INBOX` |

## USB, mises à jour, configuration, assistant
| Méthode | Route | Description |
|---|---|---|
| GET 🔒 | `/api/usb/serial?since=N` | `{pos,data,usb{host,connected,chip,vid_pid,baud,flashing,rx_total}}` |
| POST 🔒 | `/api/usb/serial` | **JSON** `{baud?, data?}` |
| POST 🔒 | `/api/usb/detect` | identifie la carte branchée (ESP32/S3/C3 par le bootloader ROM, sinon Arduino par le bootloader STK500) ; lancé aussi tout seul à chaque branchement. Résultat dans `usb.detect{busy,seq,board,profile,text}` (`board` : `avr`, `esp32`, `esp32s3`, `esp32c3`…) de `/api/system/info`, `/api/usb/serial` et `/api/usb/flash/status` |
| GET 🔒 | `/api/veille?since=N` | veille du labo : `{armed, armed_age_s, last, count, alerts[{seq,age_s,kind,text}], stations[{mac,connected,since_s,worker,name,known}], known[], rules[]}` |
| POST 🔒 | `/api/veille` | **JSON** `{armed}` · `{mac, name, known}` (appareil connu ou oublié) · `{rule:{idx?, source, key, op:">"\|"<"\|"=", value, label}}` · `{delete_rule: idx}` |
| POST 🔒 | `/api/avr/flash` | `path` (.hex), `profile` (`ATmega328P_Optiboot`, `ATmega328P_Old`, `ATmega168P_STK500`) |
| POST 🔒 | `/api/update/check` | cherche une mise à jour (GitHub Release ou manifeste) → `{available, version, notes, source, assets, …}` |
| POST 🔒 | `/api/update/approve` | télécharge et installe la mise à jour trouvée |
| POST 🔒 | `/api/ota/upload` | corps brut = image `.bin` |
| POST 🔒 | `/api/notify/test` | notification de test |
| GET 🔒 | `/api/admin/config` | configuration (secrets masqués : `*_set`) |
| POST 🔒 | `/api/admin/config` | **JSON** ; champ secret vide = inchangé ; redémarre |
| POST 🔒 / GET 🔒 | `/api/wifi/scan` | lance / lit le scan |
| POST | `/api/agent/chat` | `q` → `{answer,mode,actions[]}` (1 question / 1,5 s) |

## Service compagnon Raspberry Pi (`:8088`)

- `GET /api/v1/health` : disponibilité, architecture, Arduino CLI, nombre de projets et espace libre du volume FAT commun.
- `POST /api/v1/projects/save` : sauvegarde du sketch, `project.json` et README dans `PROJECTS/MY_PROJECTS` sur la carte FAT32 du Pi (ou microSD directe en mode S3 seul).
- POST /api/v1/build : met le build en file Pi; le binaire final vérifié est publié dans FIRMWARE/ sur la microSD de données du Pi. La base de jobs reste dans /srv/nexus.
- GET /api/v1/build/estimate?project=&board= : temps prévu avant que le firmware soit prêt (`build_s`, `wait_s`, `total_s`, `basis` = cache, project, board ou default, `ahead` = compilations en file).
- `GET /api/v1/ping` (public) : réponse minimale pour les sondes du S3. `GET /api/v1/link[?now=1]` : liaison Pi → S3 (le Pi s'annonce au S3 toutes les 30 s, `NEXUS_S3_URL`, `NEXUS_LINK_PERIOD`) ; `now=1` mesure tout de suite. `GET /api/v1/usb` : cartes série branchées sur les ports USB du Pi (`/dev/serial/by-id`, `ttyUSB*`, `ttyACM*`) avec le type deviné (ESP32 natif, CP210x, CH340, FTDI, Arduino, Pico).
- `GET/POST /api/v1/patricia/github` : état ou réglage du jeton GitHub de Patricia (le jeton n'est jamais renvoyé).
- Les routes Pi privées exigent `Authorization: Bearer <NEXUS_TOKEN>`. Le lien firmware temporaire signé est lu par le worker après autorisation explicite du MASTER S3.
- `/api/v1/patricia/*` (assistante) et `/api/v1/fleet/*` (flotte de véhicules) : voir [PATRICIA.md](PATRICIA.md#api-pi-port-8088-jeton-bearer).
- `/api/v1/appstudio/*` (Studio APK) et `/apps/<id>/` (appli web publique) : voir `pi/appstudio/api.py` et [STUDIO_APK.md](STUDIO_APK.md).
