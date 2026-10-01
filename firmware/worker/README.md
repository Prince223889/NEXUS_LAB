# Worker ESP32 LAB (Arduino)

Le **même programme** est flashé sur chaque Worker (jusqu'à 10). Le MASTER attribue W1…W10 automatiquement.

## Arduino IDE (méthode de référence)
1. Ouvrir `worker.ino` (le dossier s'appelle `worker`, comme l'exige l'IDE).
2. Carte : **ESP32 Dev Module** (ou ESP32S3 Dev Module), cœur **esp32 by Espressif 3.3.x**.
3. *Partition Scheme* : **Minimal SPIFFS (1.9MB APP with OTA)** — recommandé pour les mises à jour OTA.
4. Téléverser, puis ouvrir le moniteur série à 115200 bauds.

Aucune bibliothèque externe n'est nécessaire.

## Jobs disponibles
| Job | Rôle |
|-----|------|
| `PING` | aller-retour réseau, RSSI, RAM |
| `SYSTEM_TEST` / `CHECKUP` | CPU, flash, Wi-Fi, LittleFS |
| `BENCHMARK` | calcul entier 180 000 opérations (reprise après coupure) |
| `FS_TEST` | écriture/lecture/vérification LittleFS + débit |
| `I2C_SCAN` | recherche des périphériques I2C (SDA/SCL par défaut de la carte) |
| `WIFI_SCAN` | nombre de réseaux et meilleur signal |
| `MEM_TEST` | allocation/vérification de blocs de 4 Ko |
| `IDENTIFY` | fait clignoter la LED (GPIO2) pendant 5 s pour repérer la carte |

## Réglages (`config.h`)
- `LAB_AP_SSID` / `LAB_AP_PASSWORD` : doivent correspondre au point d'accès du MASTER.
- `WORKER_LED_PIN`, `WORKER_I2C_SDA`, `WORKER_I2C_SCL`.

Le protocole est décrit dans `docs/PROTOCOLE_WORKER.md`.
