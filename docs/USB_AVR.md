# USB : moniteur, flash ESP32 et Arduino

## Identification automatique de la carte

À chaque branchement, le MASTER identifie la carte : il essaie le bootloader ROM d'un ESP32 (SYNC + détection de puce : ESP32, ESP32-S3, ESP32-C3…), puis le bootloader STK500 d'un Arduino (profils Optiboot 115200, « Old Bootloader » 57600, ATmega168 19200, signature vérifiée). La carte redémarre ensuite sur son programme. La page **USB & Flash** choisit alors le bon type et propose :

- **ESP32 / S3 / C3** : « Installer le firmware worker » (`/sd/FIRMWARE/WORKER/<carte>/worker.bin` avec bootloader, partitions et `flash_args`, créés par `scripts\compile_all.bat`) : la carte devient un worker qui rejoint le Wi-Fi du S3 ; ou un projet de la bibliothèque ;
- **Arduino** : un projet `.hex` de `PROJECTS/ARDUINO/`, avec le bon profil de bootloader déjà sélectionné.

Le bouton « Identifier à nouveau » relance l'identification (`POST /api/usb/detect`). Patricia fait la même chose avec « flashe la carte USB ».

## Connexion physique recommandée

Pour la première utilisation, éviter de fabriquer un câble directement soudé au connecteur USB du S3. Utiliser :

```text
ESP32-S3 USB-C OTG
        ↓
adaptateur/hub OTG alimenté
        ↓
USB-A
        ↓
câble adapté à la carte cible
        ↓
Arduino Uno / autre cible CDC
```

## Signaux ESP32-S3

```text
GPIO19 → USB D-
GPIO20 → USB D+
GND    → GND
VBUS   → alimentation 5 V hôte protégée
```

Le S3 possède un contrôleur USB-OTG et un contrôleur USB-Serial-JTAG partageant le PHY. Le design ne suppose donc pas deux contrôleurs USB indépendants utilisables simultanément avec le même PHY.

## VBUS

Le projet prévoit `USB_HOST_VBUS_EN_GPIO = -1` par défaut, ce qui signifie que le VBUS est fourni par l'alimentation hôte externe. Si un montage matériel possède un interrupteur high-side/limiteur de courant pilotable, le GPIO peut être renseigné dans la configuration et le firmware activera la sortie au démarrage.

**Ne jamais alimenter le VBUS USB depuis une GPIO ESP32.**

## Moniteur série
Page **USB & Flash** (administrateur) : puces reconnues CDC-ACM (Uno R3, Leonardo, ESP32-S2/S3…), CH340/CH341, CP210x, FTDI. Débit réglable de 300 à 921 600 bauds, fin de ligne configurable, historique des commandes (↑/↓), horodatage, sauvegarde du journal. Après un flash, le débit se règle automatiquement sur celui du programme.

## Programmation d'une carte ESP32 / ESP32-S3 / ESP32-C3 par câble

La page **USB & Flash** programme aussi une carte ESP32 branchée sur le port USB-OTG du MASTER, avec le protocole du bootloader ROM d'Espressif (le même qu'esptool) :

1. Choisissez le type de carte (ESP32 Dev Module, ESP32-S3, ESP32-C3), puis le firmware (liste des projets ; le `.bin` vient de `PROJECTS/LIBRARY/<projet>/bin/<carte>/` sur la microSD, produit par `scripts\compile_all.bat`). Le **montage** du projet s'affiche sous le sélecteur.
2. « Flasher la carte ». Le MASTER met la carte en mode téléchargement par les lignes DTR/RTS (auto-reset des DevKit) ou la séquence USB-JTAG (cartes à USB natif), détecte la puce (`READ_REG` magique / `GET_SECURITY_INFO`), écrit toutes les zones du `flash_args` (bootloader, partitions, boot_app0, application) par blocs de 1 Ko et **vérifie chaque zone par MD5** calculé par la puce.
3. Le **moniteur de flash** montre les étapes, le pourcentage et le journal ; à la fin, le moniteur série s'ouvre au débit lu dans le `.ino` (Serial.begin).

Si le bootloader ne répond pas : maintenez **BOOT (IO0)**, appuyez brièvement sur **EN/RST**, relâchez BOOT, puis relancez. Un pont USB-UART DevKit classique n'a pas besoin de cette manipulation.

Sécurité : le firmware refuse de flasher si la puce détectée ne correspond pas à la carte choisie (ex. un `.bin` ESP32-S3 sur un ESP32 classique), et un bootloader à 0x1000 (réservé à l'ESP32 classique) sur un S3/C3.

## Programmation d'une carte Arduino (STK500v1)

| Profil | Cartes | Débit |
|---|---|---|
| `ATmega328P_Optiboot` | Uno, Nano (bootloader récent), Pro Mini 5 V | 115 200 |
| `ATmega328P_Old` | Nano « Old Bootloader » | 57 600 |
| `ATmega168P_STK500` | Diecimila, Nano 168 | 19 200 |

Étapes du programmeur : lecture et contrôle du fichier Intel HEX → reset par DTR/RTS → synchronisation → lecture de la signature (refus si elle ne correspond pas au profil) → écriture par pages de 128 octets → relecture et comparaison → sortie du mode programmation.

1. Arduino IDE › Croquis › *Exporter les binaires compilés* : récupérez le `.hex` **sans** bootloader (`xxx.ino.hex`).
2. Déposez-le dans `/FIRMWARE` (ou `/FIRMWARE/AVR`) via la page Fichiers.
3. Branchez la carte sur le port USB-OTG du MASTER, choisissez le fichier et le profil, « Programmer ».

Le reset automatique dépend du convertisseur USB-série ; si la synchronisation échoue, essayez l'autre profil 328P ou appuyez sur RESET au moment de lancer.
