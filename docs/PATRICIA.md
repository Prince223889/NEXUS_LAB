# Patricia : l'assistante du labo

Patricia vit sur le Raspberry Pi (`pi/patricia/`) et s'affiche dans l'interface du S3 (écran **Patricia**, bouton flottant en bas à droite, ou `Ctrl K` → « Patricia »). Elle fonctionne **sans Internet** ; une IA locale (Ollama) ou en ligne la rend plus bavarde et plus souple, mais n'est jamais obligatoire.

## Ce qu'elle sait faire

| Demande (exemples) | Ce qui se passe |
|---|---|
| « Je veux faire une station météo avec un BME280 et un écran OLED » | Projet créé dans sa mémoire, **montage** (schéma), **code** généré, bibliothèques, conseils ; boutons Studio, `.ino`, enregistrer sur le Pi |
| « Flashe la station météo sur W3 » | Proposition à confirmer → compilation sur le Pi → **schéma du montage à vérifier** → flash du worker → **lecture du moniteur** et verdict (ça marche / échec / incertain) |
| « Quelle est la température ? », « Lis les capteurs du worker 2 » | Dernières mesures envoyées au MASTER par les workers et les montages, filtrées par grandeur ou par worker ; signale les mesures qui ne se mettent plus à jour |
| « Vérifie W3 » | Lit le journal du worker (et le port USB si tu es admin) et explique ce qu'il voit |
| Coller une erreur de compilation ou un moniteur série | Diagnostic : bibliothèque manquante (installation proposée), mauvaise carte, API LEDC 3.x, brownout, Guru Meditation, watchdog, boucle de redémarrage, capteur absent, I2C… |
| « Note : commander des résistances 2 kΩ », « Rappelle-toi que ma carte est un S3 » | Notes et faits gardés en mémoire, recherche plein texte |
| « Où en est mon arrosage ? », « Améliore mon projet » | Historique du projet, prochaine étape, idées d'amélioration (elle demande si tu veux les appliquer) |
| « Lance un check-up sur tous les workers » | Job S3 proposé, exécuté après confirmation |
| « Fais une APK pour la station météo » | Le Pi crée l'application (une valeur et une courbe par mesure) et répond avec le lien direct et le QR ; à personnaliser dans le **Studio APK** ([STUDIO_APK.md](STUDIO_APK.md)) |
| « Voiture 2 va en 1,5 2 », « toutes les voitures en ligne », « stop » | Pilotage de la flotte (voir plus bas). **« stop » / « arrête tout » est immédiat**, sans confirmation |

Toute action matérielle (flash, job, déplacement, installation) est une **proposition** avec Confirmer / Annuler, valable 5 minutes. Rien ne part tout seul, et Patricia ne lance jamais la compilation complète des 320 projets.

## Voix

- **APK NEXUS** (Android) : micro et synthèse natifs du téléphone, hors ligne si le pack français est installé. Autorisation micro demandée au premier appui.
- **Navigateur** : la reconnaissance vocale du navigateur n'existe qu'en HTTPS ; sur `http://192.168.4.1` Patricia enregistre le micro et l'envoie au Pi (Vosk) si `--voice` est installé.
- Appui long sur le bouton flottant = parler directement. Mode « mains libres » dans l'écran Patricia.

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
