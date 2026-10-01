# Contribuer à ESP32 LAB

1. Créer une branche courte et descriptive.
2. Garder les changements compilables et documentés.
3. Ajouter ou mettre à jour les tests statiques concernés.
4. Ne jamais committer les mots de passe, clés API ou firmwares privés.
5. Décrire les changements de protocole Worker/Master dans `docs/PROTOCOLES.md` et les documents associés.
6. Lancez `python scripts/verify.py` avant chaque commit ; régénérez le catalogue avec `node catalog/build.js`.
