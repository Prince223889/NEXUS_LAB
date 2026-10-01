# APK NEXUS : mode téléphone, fabrication et sécurité Android

## Travailler sans le box

L'APK contient une copie complète de l'interface du MASTER (`assets/www/`, copiée automatiquement depuis
`firmware/master/www/` à chaque fabrication).

| Situation | Ce que fait l'application |
|---|---|
| Le box répond (`/api/health` en moins de 2,5 s) | Elle ouvre l'interface du box, puis lui envoie tout ce qui attend sur le téléphone. |
| Le box ne répond pas | Elle ouvre sa copie intégrée : **mode téléphone**. |
| En mode téléphone, le box revient | Elle le voit dans les 20 s et propose « Ouvrir le box et envoyer » (page **Téléphone**). |

En mode téléphone, tu gardes :

- la Bibliothèque ;
- le Studio (code, montage, brochage, variables) ;
- le Studio APK ;
- Patricia, avec le catalogue embarqué. « note que … » garde la note sur le téléphone.

Ce que tu enregistres part dans la **boîte d'envoi** :

- les projets du Studio ;
- les notes et les souvenirs de Patricia ;
- les applications du Studio APK.

Les écrans du matériel (workers, capteurs, flash) montrent un aperçu simulé, signalé en haut de l'écran par
« Téléphone · hors ligne ».

À l'ouverture du box dans l'APK, chaque élément est envoyé :

- les projets vont sur la microSD du S3 (session administrateur), ou sinon sur le Pi ;
- les notes et les applications vont au Pi.

Ce qui ne peut pas partir reste dans la boîte d'envoi : le Pi n'est pas configuré, ou le box n'a pas de session
administrateur. La page **Téléphone** du site liste ce qui a été reçu.

## Fabriquer l'APK

- **Sur GitHub (recommandé)** : le workflow `.github/workflows/android.yml` fabrique l'APK à chaque modification
  de `mobile/` ou de l'interface.
  - Elle est téléchargeable dans l'onglet *Actions*, artefact `nexus-lab-apk`.
  - Après un push sur `main`, elle est aussi publiée à une adresse fixe :
    `https://github.com/Prince223889/NEXUS_LAB/releases/download/nexus-apk/nexus-lab.apk`.
- **Sur le PC** : `scripts\build_android.bat`.

### Clé de signature stable (une seule fois)

Android n'installe une mise à jour que si elle est signée avec la même clé. Pour une clé stable, crée-la une fois
sur ton PC :

    keytool -genkeypair -v -keystore nexus.jks -alias nexus -keyalg RSA -keysize 2048 -validity 10000

Ajoute ensuite ces secrets dans *Settings › Secrets and variables › Actions* du dépôt GitHub :

| Secret | Valeur |
|---|---|
| `NEXUS_KEYSTORE_B64` | le fichier encodé en base64 : `base64 -w0 nexus.jks` (Linux) ou `certutil -encode nexus.jks nexus.b64` (Windows, sans les lignes BEGIN/END) |
| `NEXUS_KEYSTORE_PASS` | le mot de passe choisi |
| `NEXUS_KEY_ALIAS` | `nexus` |
| `NEXUS_KEY_PASS` | le mot de passe de la clé (souvent le même) |

Garde `nexus.jks` en lieu sûr et ne le mets jamais dans le dépôt. Sans ces secrets, l'APK est signée avec une
clé de débogage gardée en cache par GitHub. Si ce cache expire, désinstalle l'ancienne version avant d'installer la
nouvelle.

## Sécurité et restrictions Android vérifiées

| Point | Réglage |
|---|---|
| Permissions | `INTERNET`, `RECORD_AUDIO` (demandée au premier appui sur le micro, refus géré), `VIBRATE`, `ACCESS_NETWORK_STATE` (permission normale, sans demande : savoir si Internet est là pour choisir la voix la plus naturelle). Pas de localisation, contacts, SMS, stockage partagé ni service en arrière-plan. |
| Données du travail hors ligne | Fichier privé `outbox.bin`, chiffré en **AES-256-GCM**. La clé est générée dans le **Keystore Android** et ne peut pas en sortir. Un fichier modifié est rejeté (étiquette GCM). |
| Accès à la boîte d'envoi | Le pont JavaScript ne la lit que pour la copie intégrée (`file:///android_asset/www/`) ou l'adresse exacte du box enregistrée (schéma, hôte et port). |
| Sauvegardes | `allowBackup="false"`, `fullBackupContent` et `dataExtractionRules` : rien ne part vers le cloud ni vers un autre téléphone. |
| Réseau | HTTP autorisé, car le box, le Pi et les workers n'ont pas de certificat sur le Wi-Fi local. En HTTPS, seules les autorités du système sont acceptées, jamais un certificat ajouté par l'utilisateur. |
| Navigation | Seules les adresses locales (192.168.x, 10.x, `.local`) s'ouvrent dans l'application. Les autres partent vers le navigateur. |
| WebView | Contenu mixte interdit, pas de fenêtres multiples, accès aux fichiers coupé pour l'interface du box. Les fichiers choisis passent par le sélecteur Android. |
| Activité | Une seule activité exportée (le lanceur), `singleTask`. |
| Cible Android (`targetSdk 28`) | Gardée parce que le Pi signe les applications du Studio APK en schéma v1 (Python, sans SDK). Android 11+ exige la signature v2 pour une cible 30 ou plus. L'APK s'installe sur Android 7 à 15. Android affiche seulement un avertissement « conçue pour une ancienne version ». |

### À faire sur le téléphone

- Autoriser l'installation depuis le navigateur ou le gestionnaire de fichiers, uniquement le temps de
  l'installation.
- Laisser Play Protect actif. L'APK n'est pas sur le Play Store : Play Protect peut demander une confirmation.
- Pour la reconnaissance vocale hors ligne : *Paramètres › Saisie vocale › Reconnaissance hors ligne › Français*.
