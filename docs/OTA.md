# Mises à jour (OTA)

Dépôt : [github.com/Prince223889/ESP32-box](https://github.com/Prince223889/ESP32-box). Publiez les images compilées en tant qu’assets d’une **Release GitHub** pour que le S3 les trouve.

## MASTER
Deux méthodes, dans **Réglages › Mises à jour** (session administrateur) :

1. **Fichier** : envoyez `firmware/master/build/esp32_lab_master.bin`. L'en-tête et l'intégrité de l'image sont vérifiés pendant l'écriture dans la partition OTA libre, puis la carte redémarre dessus.
2. **GitHub Release** : renseignez `utilisateur/depot` dans `github_repo`. Le MASTER consulte la dernière Release publiée, compare son tag à `LAB_VERSION`, puis choisit le fichier `.bin` dont le nom contient `master`. Il vérifie le SHA-256 et la taille publiés par l'API GitHub avant l'installation.
3. **Manifeste HTTPS** : si aucun dépôt GitHub n'est configuré, le MASTER lit `update_manifest` et exige `version`, `master_url` et `master_sha256`.

Les fichiers posés seulement dans les branches `master` ou `work` ne sont pas recherchés : il faut joindre les `.bin` aux assets d'une Release. Les autres `.bin` de la Release sont présentés pour téléchargement manuel des workers.

```json
{
  "version": "6.0.1",
  "master_url": "https://exemple.org/esp32lab/esp32_lab_master_6.0.1.bin",
  "master_sha256": "64 caractères hexadécimaux",
  "notes": "Correctifs"
}
```
Conditions : version supérieure et image compatible avec la carte. Pour un manifeste, URL et SHA-256 doivent correspondre ; pour GitHub, l'empreinte SHA-256 et la taille de l'asset sont vérifiées. « Vérifier automatiquement » envoie une alerte, mais attend toujours l'approbation dans la page web.

**Retour arrière** : si la nouvelle version ne démarre pas correctement, le chargeur ESP-IDF revient à la précédente au redémarrage suivant.

`python scripts/make_release.py` produit l'archive, `SHA256SUMS.txt` et un manifeste prêt à publier.

## Workers
Le firmware worker est produit par `scripts\compile_all.bat` ou l'Arduino IDE (Exporter les binaires compilés). Déposez le `.bin` dans `/FIRMWARE/WORKER` de la microSD (ou téléchargez-le depuis la Release GitHub via Réglages › Mises à jour), puis **Workers › ⋯ › Mettre à jour le firmware worker (OTA)**. Le worker télécharge l'image depuis le MASTER, vérifie le SHA-256 et redémarre ; la progression s'affiche en direct dans le moniteur du worker.

## Notification WhatsApp / webhook
Le MASTER envoie les alertes WhatsApp/webhook. Dans le code actuel, l'approbation OTA se fait dans **Réglages › Mises à jour › Installer maintenant** ; aucun récepteur de réponse WhatsApp n'est configuré. La fonction entrante de CallMeBot est indiquée comme étant en développement par son fournisseur. Voir **Réglages › Configuration › Notifications** pour les réglages sortants.
