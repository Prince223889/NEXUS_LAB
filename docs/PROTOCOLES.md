# Protocoles réseau

## Workers (UDP 4211 + HTTP 80), protocole version 3

**Découverte** — le worker diffuse toutes les 2,5 s tant qu'il n'a pas de numéro :
```
HELLO|<MAC>|<version>|<IP>|<protocole>
```
Le MASTER répond (unicast) : `ASSIGN|<id>|192.168.4.1`. Le MASTER peut aussi diffuser `DISCOVER|ESP32-LAB|<version>`.

**Battement** — toutes les secondes, vers le MASTER :
```
HB|ID|MAC|ÉTAT|PROGRESSION|UPTIME_MS|RAM_LIBRE|IP|JOB|RSSI|CPU_MHZ|RAM_MIN|FLASH|CŒURS|PSRAM|
   REPRISE(0/1)|PROGRESSION_REPRISE|TYPE_REPRISE|PHASE_REPRISE|JOBS_TERMINÉS
```
Les champs vides sont conservés. Sans battement pendant le délai configuré, le worker passe « hors ligne » et ses jobs sont réattribués.

États : `BOOT`, `DISCOVERING`, `READY`, `TESTING`, `FLASHING`, `ERROR`, `RECONNECTING` (le MASTER ajoute `BUSY` et `OFFLINE`).

**HTTP du worker** : `GET /api/info`, `GET /api/capabilities`, `GET /api/scan[?start=1]`, `POST /api/job` (`type`, `priority`), `POST /api/cancel`, `POST /api/flash` (`url`, `sha256`), `POST /api/reboot`, page d'état sur `/`.

**OTA d'un worker** : le MASTER expose le `.bin` via une URL à jeton unique `http://192.168.4.1/api/fw/<jeton>` et transmet son SHA-256 ; le worker vérifie l'empreinte avant de redémarrer.

## Banc fantôme (HTTP du worker émulateur)
Le MASTER pilote un worker « émulateur » qui imite les capteurs d'un projet et observe ses actionneurs, pendant qu'un
worker « DUT » exécute ce projet (mode `PROJECT`). L'émulateur ne connaît aucun capteur : il reçoit des valeurs brutes
calculées par `catalog/src/12_bench.js`.

| Route | Paramètres | Rôle |
|---|---|---|
| `POST /api/emu/setup` | `channels=n:kind:gpio[:adresse:pointeur];…` | `kind` = `analog` (DAC), `digital` (sortie), `i2c` (esclave), `level` ou `duty` (entrée observée). État → `EMULATING` |
| `POST /api/emu/set` | `set=n:valeur;…` | millivolts (`analog`), 0/1 (`digital`), 4 chiffres hexa = registre 16 bits (`i2c`), `@0`/`@1` = composant I2C débranché/rebranché |
| `GET /api/emu/read` | — | `{"i2c_online":true,"ch":[{"n":1,"level":1},{"n":2,"duty":24.8}]}` |
| `POST /api/emu/stop` | — | libère les broches, état → `READY` (automatique après 120 s sans ordre) |

- Seules les broches du connecteur de banc (`BENCH_*` dans `firmware/worker/config.h`) sont acceptées ; `GET /api/capabilities` les annonce dans `emu{dac,dout,din,i2c_slave}`.
- Esclave I2C : un seul composant, registre 0 = mesure ; le premier octet écrit par le DUT sélectionne le registre (sauf `pointeur` = 0, ex. BH1750).
- Pendant l'émulation, les jobs et l'OTA sont refusés (409) et le moteur de jobs ignore ce worker.

**Plan** (`bench.json` dans chaque projet émulable de la bibliothèque, ou `LAB.benchPayload()`) :
```json
{"project":"app_lampe_crepusculaire","device":"lampe_crepusculaire",
 "channels":[{"n":0,"dir":"in","kind":"i2c","emu":21,"addr":35,"pointer":false},{"n":1,"dir":"out","kind":"level","emu":18}],
 "steps":[{"label":"Règle 1 — bh1750 lux = 40 (seuil franchi)","set":[{"n":0,"raw":"0030"}],"wait":2700,
           "expect":[{"feed":"bh1750_lux","v":40,"tol":1.25},{"n":1,"level":0}]}]}
```
`expect` : `{n, level}` (niveau exact), `{n, duty, tol}` (rapport cyclique en %), `{feed, v, tol}` (mesure UDP 4213 du DUT),
`{feed, absent:true}` (la mesure doit s'interrompre). Le firmware du DUT est la variante « banc » du projet (envoi au MASTER
et retour au mode worker forcés) : `python scripts/compile_projects.py --bench`.

## Mesures des montages (UDP 4213)
Une ligne texte par mesure, envoyée à `192.168.4.1:4213` :
```
LAB|<appareil>|<clé>|<valeur>|<unité>
LAB|serre|temp|23.4|°C
```
- `appareil`, `clé`, `unité` : texte court (les caractères de contrôle sont filtrés) ; valeur décimale.
- Le MASTER garde les 32 flux les plus récents, visibles dans **Capteurs en direct** et dans `/api/state`.
- Tout projet généré avec l'option « Envoyer au MASTER » utilise ce format ; n'importe quel microcontrôleur peut l'utiliser :
```cpp
WiFiUDP u; u.beginPacket(IPAddress(192,168,4,1), 4213);
u.printf("LAB|%s|%s|%.2f|%s", "atelier", "co2", co2, "ppm"); u.endPacket();
```

## Wireshark du Labo (capture MASTER)
Le MASTER peut capturer et décoder en direct les trames **de son propre labo** — jamais un réseau tiers. La capture est
**explicite** (armée depuis la page « Réseau » de la WebUI ou `POST /api/netmon/arm`), désarmée au démarrage, sans coût tant
qu'elle ne l'est pas. Un anneau de 128 trames récentes est exposé par `GET /api/netmon` (voir `API.md`).

Trames décodées : `HELLO`/`ASSIGN`/`HB`/`APP`/`DISCOVER` (4211), lignes de journal (4212), `LAB|…` (4213), `LAB|HOME` (4215)
et les requêtes HTTP sortantes vers les workers. Métriques par worker calculées sur les battements : **gigue** (écart moyen
vs 1000 ms) et **perte** (battements manqués). `ESPNOW` est prévu dans le décodeur mais inactif (aucun transport ESP-NOW).

## Journal UDP (4212)
Les workers peuvent envoyer des lignes de journal libres sur le port 4212 du MASTER.

## MQTT (option des projets)
Chaque mesure est publiée sur `lab/<appareil>/<mesure>` (valeur texte), à chaque cycle de lecture. Compatible Home Assistant / Node-RED. Le MASTER n'est pas un broker : utilisez Mosquitto sur un PC ou un Raspberry Pi.
