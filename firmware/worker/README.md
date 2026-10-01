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
| `ADC_READ` | voltmètre : tension moyenne (mV) de chaque broche sûre de l'ADC1 |
| `GPIO_TEST` | tirage interne haut/bas sur chaque broche sûre : libre, tenue à GND ou à 3V3 |
| `ONEWIRE_SCAN` | identifiants ROM du bus 1-Wire (sans bibliothèque) + température des DS18B20 |
| `LOGIC_SAMPLE` | analyseur logique : fréquence et rapport cyclique de 4 entrées (20 kHz, 1 s) |
| `PWM_GEN` | signal carré 1 kHz, 50 %, pendant 10 s |
| `SERVO_SWEEP` | balayage servo 0° → 180° → 0° |
| `TONE_TEST` | balayage buzzer 200 → 4000 Hz |

Broches par défaut des jobs « matériel » (modifiables dans `config.h`, toujours limitées aux broches sûres) :

| Carte | PWM | Servo | Buzzer | 1-Wire | Analyseur logique |
|---|---|---|---|---|---|
| ESP32 | 13 | 27 | 14 | 32 | 33, 34, 35, 36 |
| ESP32-S3 | 10 | 11 | 12 | 13 | 14, 17, 18, 21 |
| ESP32-C3 & co | 10 | 10 | 10 | 3 | 0, 1, 3, 10 |

Elles évitent la LED, le bus I2C et le connecteur du banc fantôme. Pour le 1-Wire, ajoutez une résistance de 4,7 kΩ vers 3V3 (le tirage interne ne suffit que pour un câble court).

## Réglages (`config.h`)
- `LAB_AP_SSID` / `LAB_AP_PASSWORD` : doivent correspondre au point d'accès du MASTER.
- `WORKER_LED_PIN`, `WORKER_I2C_SDA`, `WORKER_I2C_SCL`.
- `WORKER_PWM_PIN`, `WORKER_SERVO_PIN`, `WORKER_TONE_PIN`, `WORKER_ONEWIRE_PIN`, `WORKER_LOGIC_PINS` et les réglages `WORKER_PWM_*`, `WORKER_SERVO_*`, `WORKER_TONE_*`, `WORKER_LOGIC_*`, `WORKER_ADC_SAMPLES`.

Le protocole est décrit dans `docs/PROTOCOLE_WORKER.md`.
