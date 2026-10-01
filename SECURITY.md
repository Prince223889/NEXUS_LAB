# Sécurité

- Les identifiants (mot de passe admin, chemin de contrôle) sont générés aléatoirement au premier démarrage et stockés en NVS ; ils ne figurent jamais dans le dépôt.
- Changez le mot de passe du Wi-Fi par défaut (`ESP32-LAB-Setup2026!`) dès l'installation.
- Session administrateur : cookie HttpOnly + SameSite=Strict, expiration glissante, 5 essais puis blocage 60 s, comparaison à temps constant. Le réseau du labo est en HTTP : ne l'exposez pas à Internet.
- Les secrets (Wi-Fi maison, clés IA et WhatsApp) ne sont jamais renvoyés par l'API.
- Les mises à jour par Internet exigent HTTPS et une empreinte SHA-256 ; l'installation attend toujours une approbation.
- Chemins microSD validés (pas de `..`), dossiers système protégés contre la suppression.
- Signalez une vulnérabilité sans publier de secret ni de firmware privé.
