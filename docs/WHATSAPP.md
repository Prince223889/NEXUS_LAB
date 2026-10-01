# Réception WhatsApp (optionnelle)

Le compagnon Pi peut recevoir des messages texte via WhatsApp Cloud API. Cette liaison exige un compte Meta configuré, une URL HTTPS publique qui atteint le Pi et trois secrets fournis par Meta ou choisis par vous. Elle est désactivée tant que ces valeurs ne sont pas définies. Aucune clé n’est fournie dans le projet.

## Préparer le Pi

Dans `/etc/nexus/nexus.env`, ajoutez :

```ini
NEXUS_WHATSAPP_VERIFY_TOKEN=<secret-long-aleatoire-choisi-par-vous>
NEXUS_WHATSAPP_APP_SECRET=<app-secret-meta>
NEXUS_WHATSAPP_ALLOWLIST=<numero-international-sans-plus,exemple-33612345678>
```

La liste blanche est obligatoire et n’accepte que les numéros indiqués. Gardez le fichier lisible seulement par root (permissions `600`, comme après la première installation), puis redémarrez `nexus-agent`.

## Configurer Meta

Dans l’application Meta, activez WhatsApp Cloud API et abonnez-vous aux webhooks WhatsApp. Configurez l’URL de rappel `https://<votre-domaine>/webhooks/whatsapp`, le même jeton de vérification que `NEXUS_WHATSAPP_VERIFY_TOKEN`, puis abonnez-vous au champ `messages`. Le domaine doit présenter un certificat HTTPS valide et transférer cette route au Pi. Le point d’accès Wi-Fi local seul ne peut pas recevoir les rappels Meta sur Internet. N’exposez pas directement le port 8088; utilisez un reverse proxy HTTPS limité à cette route ou un relais sécurisé maintenu à jour.

## Ce que fait la réception

Le Pi vérifie la signature HMAC de Meta, limite la taille du message, filtre l’expéditeur par liste blanche et ignore les identifiants déjà reçus. Les messages texte vérifiés apparaissent dans **Messages** et dans le contexte récent de l’assistant. Les messages d’autres numéros, les doublons et les types non textuels sont ignorés. Le Pi ne répond pas automatiquement sur WhatsApp; l’utilisateur garde la main sur toute réponse envoyée.

Ne placez pas les secrets dans GitHub, une carte SD partagée ou un journal de diagnostic. Si un secret a été exposé, révoquez-le dans Meta et remplacez-le.
