# Applications Android NEXUS LAB

Deux usages doivent être distingués :

- `app-debug.apk` compilée depuis `mobile/` est l'enveloppe générale de l'interface NEXUS. Elle ouvre le MASTER S3 et mémorise son adresse. Elle n'est pas une APK personnalisée d'un projet.
- La page **Compagnon Pi** peut demander une APK propre à un projet enregistré. Le Pi injecte la fiche `project.json` dans ce modèle, puis affiche les modules, blocs SI/ALORS et l'état du MASTER en direct. Le téléchargement et son QR sont créés pour ce job. Le job Gradle Android sur le Pi nécessite un hôte Linux x86_64; le Raspberry Pi 4 ARM64 ne fournit pas les exécutables Google de compilation Android utilisés ici. Pour le Pi 4, compile une APK projet sur Windows avec `scripts\build_project_apk.bat "C:\chemin\vers\projet-extrait"`, puis publie-la sur le Pi et crée le QR avec `scripts\publish_project_apk.bat`. Le Pi vérifie l’archive, l’héberge sur son réseau local et fournit le QR à scanner.

Pour compiler l'enveloppe générale sur Windows : `scripts\build_android.bat`. Sortie : `mobile\app\build\outputs\apk\debug\app-debug.apk`. Cette APK est signée debug, à installer manuellement; elle n'est pas prévue pour Play Store. Pour une APK de projet, exporte le projet depuis le Studio, extrais son ZIP, puis utilise `build_project_apk.bat`. Le bouton Compagnon peut ensuite envoyer cette APK au Pi et afficher un QR LAN. Le QR général fourni dans le dépôt pointe vers l’enveloppe NEXUS sur `raspberrypi.local`; si ce nom n’est pas reconnu, utilise une adresse Pi réelle et régénère-le avec `scripts\make_apk_qr.py --url http://192.168.4.x:8088/download/nexus-lab.apk`. Le QR d’une APK personnalisée est fabriqué après import au Pi, depuis la page Compagnon ou `publish_project_apk.bat`.

Le tableau de bord d'une APK projet peut joindre le MASTER par HTTP sur le réseau local et continue d'afficher la fiche du projet si le MASTER est indisponible. Cela ne certifie pas le câblage ou le matériel.

## Version 1.2 : lecteur du Studio APK

Depuis la version 1.2, cette APK contient `assets/player/` : si le Pi y ajoute `player/app.js`, elle démarre l'application conçue dans le **Studio APK** au lieu de l'interface du MASTER. Le Pi la renomme et la signe lui-même, sans Gradle (voir `docs/STUDIO_APK.md`). Construis-la une fois avec `scripts\build_android.bat`, puis envoie `app-debug.apk` au Pi depuis Studio APK → Publier. `assets/player/runtime.js` est une copie de `firmware/master/www/src/57_appruntime.js` : après l'avoir modifié, lance `python3 scripts/sync_app_runtime.py`.

## Version 1.3 : mode téléphone

L'APK embarque l'interface du MASTER (copiée depuis `firmware/master/www/` à la fabrication). Sans le box, elle ouvre cette copie : Studio, Bibliothèque, Studio APK et notes de Patricia restent utilisables. Le travail attend dans une boîte d'envoi chiffrée (AES-256-GCM, clé du Keystore Android), puis part au box dès qu'il est joignable. Fabrication sur GitHub Actions (`.github/workflows/android.yml`) avec lien direct dans la Release « nexus-apk ». Détails et contrôles de sécurité : `docs/ANDROID_SECURITE.md`.
