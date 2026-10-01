# Workers montés sur véhicules : limites et essais sûrs

Le S3 identifie et surveille jusqu’à dix workers compatibles, mais la liaison Wi-Fi n’est pas un système de sécurité automobile et le projet ne possède pas de localisation commune des véhicules. Il ne peut donc pas garantir à lui seul l’absence de collision entre dix voitures.

Un worker flashé avec un autre programme ne reste pilotable depuis le S3 que si ce programme conserve le protocole NEXUS de découverte, de battement et de commande. Un `.bin` arbitraire peut retirer cette compatibilité.

Avant toute mise en mouvement :

1. Vérifie que chaque worker apparaît avec un identifiant distinct et que la commande d’arrêt agit sur le bon véhicule.
2. Ajoute à chaque véhicule un arrêt moteur matériel local, un watchdog/dead-man qui coupe les moteurs si les commandes expirent, et des capteurs d’obstacle ou un pare-chocs.
3. Teste une seule voiture, à faible vitesse, dans une zone dégagée; ajoute les autres une par une et vérifie les pertes Wi-Fi et les arrêts.
4. Ne laisse jamais une voiture se déplacer hors de la vue d’un opérateur. Ne compte pas sur le Wi-Fi, le cloud ou une réponse du Pi pour l’arrêt d’urgence.

Pour une vraie coordination multi-véhicule, chaque véhicule doit publier sa position ou son état d’occupation et le MASTER doit réserver des zones avec expiration; ces fonctions dépendent de capteurs/localisation que le matériel annoncé ne précise pas. Tant qu’elles ne sont pas installées et testées, utilise les véhicules séparément.
