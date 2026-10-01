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

## État et système
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/state` | `master{…}`, `jobs{queued,running,success,failed}`, `workers[]`, `feeds[]`, `bench{…}` (résumé du banc), `event_seq` |
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

Types de job : `PING`, `SYSTEM_TEST` (alias `CHECKUP`), `BENCHMARK`, `FS_TEST`, `MEM_TEST`, `I2C_SCAN`, `WIFI_SCAN`, `IDENTIFY`.

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
- Les routes Pi privées exigent `Authorization: Bearer <NEXUS_TOKEN>`. Le lien firmware temporaire signé est lu par le worker après autorisation explicite du MASTER S3.
- `/api/v1/patricia/*` (assistante) et `/api/v1/fleet/*` (flotte de véhicules) : voir [PATRICIA.md](PATRICIA.md#api-pi-port-8088-jeton-bearer).
- `/api/v1/appstudio/*` (Studio APK) et `/apps/<id>/` (appli web publique) : voir `pi/appstudio/api.py` et [STUDIO_APK.md](STUDIO_APK.md).
