# Studio APK : ton application Android sans coder

L'écran **Studio APK** (menu Créer) fonctionne comme MIT App Inventor, avec quelques avantages :

- **Rien à compiler.** Le Pi assemble et signe l'APK en quelques secondes, même sur le Raspberry Pi 4.
- **Données du labo branchées directement.** Les mesures que tes montages envoient au MASTER alimentent l'application telles quelles.
- **Aperçu exact.** Le téléphone de l'aperçu utilise le même moteur que l'application installée.
- **Lien direct, QR et appli web.** À la fin, tu obtiens un lien de téléchargement, un QR à scanner et une appli web à ouvrir sans rien installer.

## Créer une application

1. **Application** : donne un nom, une icône (emoji) et une couleur. Tu peux aussi partir d'un modèle :
   - tableau de bord ;
   - télécommande ;
   - manette de voiture ;
   - commande vocale ;
   - contrôle du labo ;
   - projet ouvert dans le Studio (une valeur et une courbe par mesure).
2. **Concevoir** : clique un composant de la palette, ou glisse-le dans le téléphone. Clique ensuite dessus pour le régler à droite. Tu peux ajouter plusieurs écrans, qui deviennent des onglets en bas de l'application.
3. **Variables** : chaque variable garde une valeur et s'écrit `{nom}` partout. Elle peut venir de trois sources :
   - **Capteur du MASTER** : la mesure `appareil/clé` envoyée par ton montage (option « Envoyer au MASTER » du Studio). L'adresse IP de l'appareil est aussi disponible avec `{nom_ip}`.
   - **Adresse HTTP** : un JSON lu toutes les N secondes. Par exemple, la page `/api` d'un projet généré avec l'option « page web », chemin `values.0`.
   - **Locale** : la valeur est réglée par un interrupteur, un curseur, une saisie, la voix…
4. **Blocs « quand… alors… »** : choisis un déclencheur, puis les actions qu'il lance.
   - Déclencheurs possibles : au démarrage, toutes les N secondes, au dépassement ou à la descente d'un seuil (déclenché une seule fois au franchissement), à l'égalité avec une valeur, à chaque changement, à l'ouverture d'un écran.
   - Actions possibles : régler une variable, avec calcul (par exemple `{x} * 1.8 + 32`) ; envoyer une requête HTTP à un appareil ; lancer un job du MASTER ; changer d'écran ; parler ; écouter la voix ; afficher un message ; vibrer.
5. **Tester** : l'aperçu passe en vrai fonctionnement. Les requêtes vers tes appareils passent par le Pi, et le journal affiche chaque réponse.
6. **Publier** → **Créer l'APK**. Tu obtiens :
   - le lien direct `http://<pi>:8088/download/apps/<id>/<job>.apk` ;
   - le QR à scanner ;
   - l'appli web `http://<pi>:8088/apps/<id>/`.

Depuis le **Studio** (onglet Application), un projet avec l'option « Pilotage par application » donne directement une application à deux écrans : mesures, et commandes de ses actionneurs et variables (voir [STUDIO_VARIABLES.md](STUDIO_VARIABLES.md)).

Patricia sait le faire aussi : « fais-moi une APK pour la serre » crée une première version depuis le projet en mémoire et répond avec le lien et le QR.

## Composants

Titre, Texte (avec `{variables}`), Image (emoji), Lien, Espace · Valeur (couleurs d'alerte), Jauge, Courbe, Voyant · Bouton, Interrupteur, Curseur, Saisie, Joystick.

## Comment le Pi fabrique l'APK sans compiler

L'APK NEXUS (`mobile/`, version 1.2 ou plus) contient un **lecteur** (`assets/player/`). Pour chaque application, le Pi suit ces étapes :

1. Il reprend l'APK NEXUS. Il y ajoute ta conception (`assets/player/app.js`) et met à jour le moteur (`runtime.js`).
2. Il renomme le paquet (`local.nexus.apps.<id>`), le nom affiché et la version dans le manifeste binaire (`pi/appstudio/axml.py`). Chaque application s'installe ainsi à côté des autres.
3. Il signe l'APK avec la **clé du labo**, créée une fois dans `/srv/nexus/appstudio/keys` (`pi/appstudio/apksign.py`).
   - La signature v1 est écrite en Python, ce qui suffit pour cette APK (targetSdk 28).
   - Si `apksigner` est installé (`sudo apt install apksigner`), le Pi signe en v2 et v3.
   - **Sauvegarde ce dossier.** Sans la même clé, une nouvelle version ne s'installe plus par-dessus l'ancienne.

Une seule chose demande un PC, et une seule fois : construire l'APK NEXUS 1.2 avec `scripts\build_android.bat`. Envoie-la ensuite au Pi depuis Studio APK → Publier, ou copie-la dans `/srv/nexus/packages/nexus-lab.apk`. En attendant, l'appli web fonctionne déjà.

## Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié :
- Les tests `pi/tests/test_appstudio.py` contrôlent le manifeste, la signature, l'alignement, les erreurs de conception, le relais et les routes HTTP.
- Une APK assemblée à partir du code de `mobile/` (compilée avec aapt, javac et dx) a été retouchée par le Pi. L'outil `apksigner verify` de Google l'accepte, en v1 seule comme en v2/v3.
- L'écran Studio APK et l'appli web ont été essayés dans Chromium : conception, glisser-déposer, test avec un appareil simulé, publication, QR.

Pas vérifié : l'installation sur un vrai téléphone Android. Fais un premier essai sur ton téléphone avant de distribuer des APK.

## Sécurité

- Le relais du Pi ne joint que des adresses du réseau local.
  - Une appli web ne peut joindre que les adresses prévues dans sa conception, plus les routes `/api/feeds`, `/api/state` et `/api/job` du MASTER.
  - Le Studio, lui, utilise le jeton du Pi.
- L'APK n'ouvre que le lecteur local ; les liens externes s'ouvrent dans le navigateur du téléphone.
- Une APK signée par la clé du labo n'est pas publiée sur le Play Store. Le téléphone demande d'autoriser l'installation depuis cette source.
