# Dépannage

## Compilation du MASTER (ESP-IDF 6.1)
| Symptôme | Solution |
|---|---|
| `idf.py` introuvable | ouvrez « ESP-IDF 6.1 PowerShell » ou lancez `export.ps1` |
| erreurs de chemin, `ninja: error: ... too long` | projet et ESP-IDF dans des chemins courts sans espace (`C:\lab\ESP32_LAB`) |
| « file has modification time in the future » en boucle | horloge Windows fausse ou fichiers extraits avec une date future : `scripts\doctor_windows.ps1 -FixTimestamps` |
| échec du téléchargement des composants | connexion Internet requise au premier build ; relancez `idf.py reconfigure` |
| ancien `sdkconfig` d'une version 5.x | supprimez `build/` et `sdkconfig`, puis `idf.py build` |
| `A fatal error occurred: No serial data received` | utilisez le port USB-UART (CH343), maintenez BOOT en branchant |
| `Python requirements are not satisfied` | relancez l'installateur ESP-IDF ou `idf_tools.py install-python-env` |
| Le S3 redémarre quand un appareil rejoint son Wi-Fi | l’événement de connexion AP du firmware journalise le client sans appeler `esp_restart()`; notez `reset_reason` dans Système et le journal série au redémarrage, puis vérifiez l’alimentation 5 V/USB et le courant disponible avec les autres clients débranchés. Le code seul ne permet pas de diagnostiquer une chute d’alimentation ou un plantage matériel. |

## Fonctionnement
| Symptôme | Solution |
|---|---|
| microSD absente | FAT32 obligatoire, câblage CS10/MOSI11/SCK12/MISO13, carte ≤ 32 Go ou partition FAT32 |
| la page ne s'ouvre pas | vérifiez que le téléphone est bien sur « ESP32-LAB » et désactivez les données mobiles ; tapez `http://192.168.4.1` |
| aucun worker | même SSID et mot de passe dans `config.h` ; regardez le moniteur série du worker ; bouton **Découvrir** |
| worker hors ligne en permanence | signal trop faible (< −80 dBm), alimentation insuffisante ; changez de canal (Réglages › Réseau) |
| « connexion administrateur requise » | ouvrez le chemin de contrôle (BOOT 3 s pour le réafficher) |
| DHT : pas de mesure | GPIO et type (11/22) dans Réglages › Configuration ; résistance de tirage 10 kΩ |
| carte Arduino non détectée | câble OTG, hub alimenté, puce USB supportée (CDC, CH34x, CP210x, FTDI) |

## Projets de la bibliothèque
- Installez **exactement** les bibliothèques indiquées (versions testées dans le README du projet).
- `nan` à l'écran : capteur non câblé, mauvaise alimentation ou mauvaise adresse I2C (outil *Adresses I2C* et job *Scan I2C*).
- Capteur 5 V (HC-SR04, MQ-x…) : la sortie doit passer par un pont diviseur (outil *Pont diviseur*).
- Wi-Fi + lecture analogique : seules les broches ADC1 fonctionnent, déjà choisies par le générateur.
