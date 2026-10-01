# Studio : variables, pilotage par application et montage

## Variables liées aux capteurs

Dans le Studio, la carte **Variables** crée des variables du programme (`float v_<nom>`). Chaque variable a deux modes possibles :

- **Liée à un capteur** : elle suit une mesure, avec une conversion optionnelle `mesure × k + b`. Par exemple × 1,8 + 32 pour passer des °C aux °F. Si la mesure est invalide (`NAN`), la variable garde sa dernière valeur.
- **Libre** : elle part d'une valeur de départ. Coche « Réglable depuis l'application » pour en faire une consigne que l'APK ou la page web peut changer.

Chaque variable est publiée comme une mesure (`var_<nom>`) : dans le moniteur et le traceur série, vers le MASTER et en MQTT si ces options sont actives, et dans `/api`.

Les **automatismes** peuvent utiliser une variable :

- comme source : « si **Variable temp** > … » ;
- comme seuil : « si temp > **variable consigne** ». L'hystérésis s'applique aussi au seuil variable.

Exemple :

```
float v_temp = NAN;          // temp ← DHT22 Température
float v_consigne = 24.0f;    // consigne (réglable par l'application)
...
if (rule1 != 1 && v_temp > v_consigne) { rule1 = 1; m2_on(); }
else if (rule1 != 0 && v_temp < (v_consigne - 0.5f)) { rule1 = 0; m2_off(); }
```

## Pilotage par application

L'option **Pilotage par application** (carte Connectivité) active la page web du montage et ajoute deux routes :

- `GET /api` : mesures et variables (`values`, `vars`), plus la liste des commandes (`controls`). Elle est ouverte à l'appli web grâce à CORS.
- `GET /set?<nom>=<valeur>` : chaque actionneur accepte `on`, `off`, `toggle` ou un nombre (consigne d'un servo, d'un variateur…). Chaque variable réglable s'écrit `var_<nom>=<nombre>`. Plusieurs commandes peuvent passer en une seule requête : `/set?led=on&servo=90`.

Un actionneur piloté par l'application n'exécute plus son programme de démonstration.

L'onglet **Application** du Studio liste ce que l'APK lit et commande. Le bouton **Créer l'application dans le Studio APK** prépare une application avec :

- un écran **Mesures** : une valeur par mesure, et des courbes ;
- un écran **Commandes** : un interrupteur par actionneur tout-ou-rien, un curseur par actionneur réglable et par variable réglable.

L'adresse du montage vient des mesures reçues par le MASTER (`{mesure_ip}`). Sans mesure, une saisie « Adresse IP du montage » est ajoutée.

Sans l'option, le code généré est identique à avant : les 320 projets de la bibliothèque n'ont pas changé.

## Montage

- L'onglet **Montage** du Studio affiche le schéma de câblage (SVG, téléchargeable) et le tableau broche par broche.
- Avant chaque flash d'un worker, Patricia affiche le même schéma et attend « Le montage est prêt, flasher ».

## Ligne de commande

`scripts/nexus.py` fait la même chose sans l'interface. Exemples :

```bash
python3 scripts/nexus.py generate serre.json --out serre/   # .ino + MONTAGE.md + montage.svg, sans compiler
python3 scripts/nexus.py device 192.168.4.23                # lit /api
python3 scripts/nexus.py device 192.168.4.23 led=on var_consigne=22
```

La liste complète des commandes est dans `python3 scripts/nexus.py --help` : Patricia, notes, projets, jobs, APK, flotte, arrêt…
