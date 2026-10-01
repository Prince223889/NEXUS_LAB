"""Diagnostic des erreurs : compilation, téléversement et moniteur série.

Patricia lit un journal (sortie d'arduino-cli, d'esptool ou du moniteur série) et rend une liste de
constats : ce qui ne va pas, pourquoi, et la correction à appliquer. `verify_run` juge si un
programme qui vient d'être flashé fonctionne d'après ce qu'il écrit sur le port série.

Ce module ne devine pas : il reconnaît des signatures connues (documentation Espressif, Arduino-ESP32 3.x,
GCC). Un journal sans signature reconnue reçoit un verdict « incertain » plutôt qu'une fausse certitude.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict

# En-tête manquant → bibliothèque Arduino à installer (nom exact du gestionnaire de bibliothèques).
HEADER_LIBS = {
    "DHT.h": "DHT sensor library", "DHT_U.h": "DHT sensor library", "Adafruit_Sensor.h": "Adafruit Unified Sensor",
    "Adafruit_BME280.h": "Adafruit BME280 Library", "Adafruit_BMP280.h": "Adafruit BMP280 Library",
    "Adafruit_BME680.h": "Adafruit BME680 Library", "Adafruit_AHTX0.h": "Adafruit AHTX0",
    "Adafruit_SHT31.h": "Adafruit SHT31 Library", "Adafruit_SSD1306.h": "Adafruit SSD1306", "Adafruit_GFX.h": "Adafruit GFX Library",
    "Adafruit_BusIO_Register.h": "Adafruit BusIO", "Adafruit_I2CDevice.h": "Adafruit BusIO",
    "Adafruit_MPU6050.h": "Adafruit MPU6050", "Adafruit_ADS1X15.h": "Adafruit ADS1X15", "Adafruit_INA219.h": "Adafruit INA219",
    "Adafruit_NeoPixel.h": "Adafruit NeoPixel", "Adafruit_VL53L0X.h": "Adafruit_VL53L0X", "Adafruit_PWMServoDriver.h": "Adafruit PWM Servo Driver Library",
    "Adafruit_MLX90614.h": "Adafruit MLX90614 Library", "Adafruit_TCS34725.h": "Adafruit TCS34725", "Adafruit_Fingerprint.h": "Adafruit Fingerprint Sensor Library",
    "OneWire.h": "OneWire", "DallasTemperature.h": "DallasTemperature", "BH1750.h": "BH1750",
    "LiquidCrystal_I2C.h": "LiquidCrystal I2C", "U8g2lib.h": "U8g2", "TFT_eSPI.h": "TFT_eSPI",
    "PubSubClient.h": "PubSubClient", "ArduinoJson.h": "ArduinoJson", "ESP32Servo.h": "ESP32Servo",
    "FastLED.h": "FastLED", "TinyGPS++.h": "TinyGPSPlus", "TinyGPSPlus.h": "TinyGPSPlus", "MFRC522.h": "MFRC522",
    "HX711.h": "HX711 Arduino Library", "RTClib.h": "RTClib", "IRremote.h": "IRremote", "IRremote.hpp": "IRremote",
    "NewPing.h": "NewPing", "AccelStepper.h": "AccelStepper", "Keypad.h": "Keypad", "MPU6050.h": "MPU6050",
    "SparkFun_SCD30_Arduino_Library.h": "SparkFun SCD30 Arduino Library", "SensirionI2cScd4x.h": "Sensirion I2C SCD4x",
    "PZEM004Tv30.h": "PZEM-004T-v30", "DFRobotDFPlayerMini.h": "DFRobotDFPlayerMini", "WebSocketsServer.h": "WebSockets",
    "ESPAsyncWebServer.h": "ESP Async WebServer", "AsyncTCP.h": "Async TCP", "Bounce2.h": "Bounce2", "VL53L0X.h": "VL53L0X",
    "MAX30105.h": "SparkFun MAX3010x Pulse and Proximity Sensor Library", "QMC5883LCompass.h": "QMC5883LCompass",
}
# En-têtes fournis par le cœur ESP32 : leur absence signifie une mauvaise carte sélectionnée.
CORE_HEADERS = {"WiFi.h", "WebServer.h", "Preferences.h", "esp_now.h", "BluetoothSerial.h", "SPIFFS.h", "LittleFS.h",
                "HTTPClient.h", "Update.h", "ESPmDNS.h", "WiFiUdp.h", "esp_sleep.h", "driver/ledc.h", "esp_task_wdt.h"}

WIFI_REASONS = {
    "2": ("AUTH_EXPIRE", "authentification expirée : signal faible ou point d'accès saturé"),
    "4": ("ASSOC_EXPIRE", "association expirée : rapproche la carte du point d'accès"),
    "8": ("ASSOC_LEAVE", "la carte a quitté le réseau (WiFi.disconnect() ou redémarrage)"),
    "15": ("4WAY_HANDSHAKE_TIMEOUT", "mot de passe Wi-Fi probablement faux"),
    "201": ("NO_AP_FOUND", "réseau introuvable : nom (SSID) erroné, réseau 5 GHz, ou trop loin"),
    "202": ("AUTH_FAIL", "authentification refusée : mot de passe ou sécurité incompatible"),
    "203": ("ASSOC_FAIL", "association refusée : liste blanche MAC ou trop de clients (le S3 accepte 10 clients)"),
    "204": ("HANDSHAKE_TIMEOUT", "échange de clés expiré : mot de passe faux ou signal faible"),
}

RESET_REASONS = {
    "0x1": ("POWERON_RESET", "info", "mise sous tension normale"),
    "0x3": ("SW_RESET", "info", "redémarrage logiciel (esp_restart)"),
    "0x4": ("OWDT_RESET", "bad", "watchdog : le programme est resté bloqué"),
    "0x5": ("DEEPSLEEP_RESET", "info", "réveil de veille profonde"),
    "0x7": ("TG0WDT_SYS_RESET", "bad", "watchdog du groupe 0 : boucle bloquante sans pause"),
    "0x8": ("TG1WDT_SYS_RESET", "bad", "watchdog du groupe 1 : interruption trop longue ou boucle bloquante"),
    "0x9": ("RTCWDT_SYS_RESET", "bad", "watchdog RTC : blocage au démarrage"),
    "0xc": ("SW_CPU_RESET", "warn", "redémarrage du CPU, souvent après une panique (voir Guru Meditation)"),
    "0xf": ("RTCWDT_BROWN_OUT_RESET", "bad", "chute de tension (brownout)"),
    "0x10": ("RTCWDT_RTC_RESET", "bad", "watchdog RTC"),
}

PANIC_HINTS = {
    "LoadProhibited": "lecture à une adresse invalide : pointeur nul ou objet non initialisé (capteur non démarré, tableau dépassé)",
    "StoreProhibited": "écriture à une adresse invalide : pointeur nul, tableau dépassé, objet détruit",
    "InstrFetchProhibited": "saut vers une adresse invalide : pointeur de fonction nul ou pile corrompue",
    "IllegalInstruction": "instruction invalide : fonction sans « return » qui devait renvoyer une valeur, ou pile corrompue",
    "LoadStoreAlignment": "accès mémoire non aligné : cast de pointeur vers un type plus large",
    "IntegerDivideByZero": "division entière par zéro",
    "Unhandled debug exception": "point d'arrêt ou débordement de pile (stack canary)",
    "Double exception": "exception pendant le traitement d'une exception : pile épuisée",
    "Cache disabled but cached memory region accessed": "fonction d'interruption hors IRAM : ajoute IRAM_ATTR à l'ISR",
}


@dataclass
class Finding:
    code: str
    severity: str          # info | warn | bad
    title: str
    explanation: str
    fixes: list[str] = field(default_factory=list)
    line: int | None = None
    evidence: str = ""
    auto_fix: dict | None = None   # correction applicable automatiquement (installer une bibliothèque…)

    def dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v not in (None, "", [])}


def _lines(text: str) -> list[str]:
    return str(text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")


def analyze_compile(log: str) -> list[Finding]:
    out: list[Finding] = []
    seen: set[str] = set()

    def add(f: Finding):
        key = f.code + "|" + f.evidence
        if key not in seen:
            seen.add(key)
            out.append(f)

    for i, raw in enumerate(_lines(log), 1):
        line = raw.strip()
        m = re.search(r"(?:^|[/\\])([\w./+-]+?)\.ino:(\d+):\d+: error: (.*)", line) or re.search(r"([\w./+-]+?\.(?:cpp|c|h)):(\d+):\d+: error: (.*)", line)
        src_line = int(m.group(2)) if m else None
        m_h = re.search(r"fatal error: ([\w./+-]+): No such file or directory", line)
        if m_h:
            header = m_h.group(1)
            base = header.rsplit("/", 1)[-1] if header not in CORE_HEADERS else header
            if header in CORE_HEADERS or base in CORE_HEADERS:
                add(Finding("wrong_board", "bad", f"{header} introuvable : mauvaise carte",
                            f"{header} fait partie du cœur ESP32. Le projet est compilé pour une carte qui ne le fournit pas (AVR, ou cœur esp32 absent).",
                            ["Choisis une carte ESP32 (esp32:esp32:esp32, esp32s3 ou esp32c3).", "Installe le cœur : arduino-cli core install esp32:esp32@3.3.12"], src_line, line))
            else:
                lib = HEADER_LIBS.get(base)
                add(Finding("missing_library", "bad", f"Bibliothèque manquante : {header}",
                            f"Le compilateur ne trouve pas {header}." + (f" Il est fourni par la bibliothèque « {lib} »." if lib else " Cherche la bibliothèque qui fournit cet en-tête."),
                            [f'arduino-cli lib install "{lib}"' if lib else f'arduino-cli lib search "{base[:-2] if base.endswith(".h") else base}"',
                             "Vérifie la casse exacte du nom de fichier (Linux distingue majuscules et minuscules)."], src_line, line,
                            {"type": "install_library", "library": lib} if lib else None))
            continue
        if re.search(r"'ledc(Setup|AttachPin|DetachPin)' was not declared", line):
            add(Finding("ledc_api_v3", "bad", "Ancienne API LEDC (Arduino-ESP32 2.x)",
                        "Arduino-ESP32 3.x a remplacé ledcSetup()/ledcAttachPin() par ledcAttach(broche, fréquence, résolution) et ledcWrite(broche, valeur).",
                        ["Remplace ledcSetup(canal, f, r); ledcAttachPin(broche, canal); par ledcAttach(broche, f, r);",
                         "Remplace ledcWrite(canal, v) par ledcWrite(broche, v)."], src_line, line))
            continue
        if re.search(r"'(timerBegin|timerAttachInterrupt|timerAlarmWrite|timerAlarmEnable)'", line) and ("not declared" in line or "too many arguments" in line or "no matching" in line):
            add(Finding("timer_api_v3", "bad", "Ancienne API des timers (Arduino-ESP32 2.x)",
                        "En 3.x : timerBegin(fréquence_Hz), timerAttachInterrupt(timer, isr), timerAlarm(timer, compte, autoreload, 0).",
                        ["timer = timerBegin(1000000); timerAttachInterrupt(timer, &onTimer); timerAlarm(timer, 1000000, true, 0);"], src_line, line))
            continue
        m2 = re.search(r"'([\w:]+)' was not declared in this scope", line)
        if m2:
            name = m2.group(1)
            fix = ["Vérifie l'orthographe et la casse.", "Déclare la variable avant son utilisation ou ajoute l'#include qui la définit."]
            if name in ("LED_BUILTIN", "BUILTIN_LED"):
                fix = ["Cette carte ne définit pas LED_BUILTIN : remplace-le par le numéro de broche (souvent 2 sur ESP32 DevKit, 48 RGB sur S3)."]
            add(Finding("undeclared", "bad", f"« {name} » n'est pas déclaré", "Le nom est utilisé avant d'avoir été déclaré, ou mal orthographié.", fix, src_line, line))
            continue
        m3 = re.search(r"expected '([;,)}\]])' before", line)
        if m3:
            add(Finding("syntax", "bad", f"Il manque « {m3.group(1)} »", "Erreur de syntaxe : le caractère manque souvent à la fin de la ligne précédente.",
                        [f"Regarde la ligne {src_line - 1 if src_line else '?'} et la ligne {src_line or '?'} ; ajoute « {m3.group(1)} »."], src_line, line))
            continue
        if "expected unqualified-id" in line or "expected declaration before '}'" in line:
            add(Finding("braces", "bad", "Accolades déséquilibrées", "Une accolade fermante en trop, ou du code en dehors d'une fonction.",
                        ["Compte les { et } ; utilise l'indentation automatique (Ctrl+T dans l'IDE Arduino) pour repérer l'erreur."], src_line, line))
            continue
        if re.search(r"redefinition of|multiple definition of", line):
            add(Finding("redefinition", "bad", "Définition en double", "Le même nom est défini deux fois (deux fichiers, ou deux bibliothèques concurrentes).",
                        ["Supprime la définition en double ou renomme-la.", "Si deux bibliothèques fournissent le même en-tête, désinstalle l'une d'elles."], src_line, line))
            continue
        if re.search(r"no matching function for call to '([\w:]+)", line):
            fn = re.search(r"no matching function for call to '([\w:]+)", line).group(1)
            add(Finding("signature", "bad", f"Mauvais arguments pour {fn}", "La fonction existe mais pas avec ces types ou ce nombre d'arguments ; souvent un changement de version de bibliothèque.",
                        ["Compare avec les exemples de la version installée de la bibliothèque.", "Installe la version exacte indiquée dans le README du projet."], src_line, line))
            continue
        if re.search(r"invalid conversion from|cannot convert", line):
            add(Finding("conversion", "warn", "Conversion de type invalide", "Un type est passé là où un autre est attendu (String vs const char*, int vs pointeur).",
                        ["Pour une String vers const char*, utilise maChaine.c_str()."], src_line, line))
            continue
        if re.search(r"region `?\w+'? overflowed|Sketch too big|text section exceeds available space|section `\.\w+' will not fit", line, re.I):
            add(Finding("too_big", "bad", "Programme trop gros pour la partition", "Le binaire dépasse la place de la partition application.",
                        ["Choisis un schéma de partition plus grand : --board-options PartitionScheme=huge_app (3 Mo, sans OTA).",
                         "Ou retire des bibliothèques inutilisées / polices d'écran."], src_line, line, {"type": "board_option", "option": "PartitionScheme=huge_app"}))
            continue
        if re.search(r"Platform '([\w:]+)' not found|Error resolving FQBN|Invalid FQBN", line):
            add(Finding("core_missing", "bad", "Cœur de carte absent", "arduino-cli ne connaît pas cette carte.",
                        ["sudo bash pi/setup_arduino.sh (installe esp32:esp32@3.3.12)"], None, line))
            continue
        if "error:" in line and m and not any(f.line == src_line for f in out):
            add(Finding("compile_error", "bad", "Erreur de compilation", m.group(3)[:200], ["Ouvre le fichier à la ligne indiquée."], src_line, line))
    for raw in _lines(log):
        if re.search(r"warning: unused variable", raw):
            add(Finding("unused", "info", "Variable inutilisée", "Sans danger, mais souvent le signe d'un oubli.", [], None, raw.strip()))
            break
    return out


def analyze_upload(log: str) -> list[Finding]:
    out: list[Finding] = []
    t = str(log or "")
    if re.search(r"Failed to connect to ESP32|No serial data received|Wrong boot mode detected|Timed out waiting for packet header", t):
        out.append(Finding("no_sync", "bad", "La carte ne répond pas au flash",
                           "esptool n'arrive pas à faire entrer la puce en mode téléchargement.",
                           ["Maintiens BOOT, appuie sur EN/RST, relâche BOOT au début de « Connecting… ».",
                            "Essaie un autre câble USB (beaucoup ne transportent que le courant).",
                            "Ajoute un condensateur de 10 µF entre EN et GND si la carte n'entre jamais en mode téléchargement.",
                            "Débranche ce qui est relié à GPIO0, GPIO2, GPIO12 (ESP32) ou GPIO0/45/46 (S3) pendant le flash."]))
    if re.search(r"could not open port|Permission denied: '/dev/tty|Access is denied|Resource busy|port is busy", t, re.I):
        out.append(Finding("port_busy", "bad", "Port série occupé ou interdit",
                           "Un autre programme utilise le port (moniteur série ouvert), ou l'utilisateur n'a pas les droits.",
                           ["Ferme le moniteur série avant de flasher.", "Sur le Pi : sudo usermod -aG dialout nexus puis redémarre le service."]))
    if re.search(r"MD5 of file does not match|Hash of data verified.*?failed|checksum error", t, re.I):
        out.append(Finding("corrupt", "bad", "Écriture corrompue", "Le contenu relu ne correspond pas au fichier envoyé.",
                           ["Baisse la vitesse : --upload-speed 115200.", "Alimentation USB insuffisante : utilise un hub alimenté.", "Recommence ; si ça persiste, la flash de la carte est peut-être usée."]))
    if re.search(r"This chip is (ESP32-\w+), not (ESP32-?\w*)", t):
        m = re.search(r"This chip is (ESP32-\w+), not (ESP32-?\w*)", t)
        out.append(Finding("chip_mismatch", "bad", f"Mauvaise puce : {m.group(1)} au lieu de {m.group(2)}",
                           "Le binaire a été compilé pour une autre famille de puce.", [f"Recompile pour {m.group(1)}."]))
    if re.search(r"Hash of data verified|Leaving\.\.\.|Hard resetting via RTS pin", t) and not out:
        out.append(Finding("upload_ok", "info", "Téléversement réussi", "Les données ont été écrites et vérifiées.", []))
    return out


def analyze_serial(log: str) -> list[Finding]:
    out: list[Finding] = []
    lines = _lines(log)
    text = "\n".join(lines)
    boots = len(re.findall(r"^rst:0x[0-9a-f]+ \(", text, re.M)) + len(re.findall(r"^ESP-ROM:esp32", text, re.M))
    if "Brownout detector was triggered" in text or re.search(r"rst:0xf \(", text):
        out.append(Finding("brownout", "bad", "Chute de tension (brownout)",
                           "L'alimentation s'effondre, souvent quand le Wi-Fi démarre ou qu'un moteur/servo appelle du courant.",
                           ["Alimente les moteurs/servos séparément (masse commune).", "Ajoute 470 µF à 1000 µF près de l'alimentation de la carte.",
                            "Utilise un câble USB court et un chargeur d'au moins 1 A."]))
    m = re.search(r"Guru Meditation Error: Core\s+(\d) panic'ed \(([^)]+)\)", text)
    if m:
        kind = m.group(2).strip()
        hint = next((v for k, v in PANIC_HINTS.items() if k.lower() in kind.lower()), "plantage du programme")
        bt = re.search(r"Backtrace:((?:\s*0x[0-9a-f]{8}:0x[0-9a-f]{8})+)", text)
        fixes = ["Vérifie que chaque capteur a été initialisé avec succès avant d'être lu.", "Contrôle les indices de tableaux et les pointeurs."]
        if bt:
            fixes.append("Décode la pile : xtensa-esp32-elf-addr2line -pfiaC -e build/projet.ino.elf " + " ".join(x.split(":")[0] for x in bt.group(1).split()))
        out.append(Finding("panic", "bad", f"Plantage : {kind} (cœur {m.group(1)})", hint, fixes, evidence=m.group(0)))
    if re.search(r"Stack canary watchpoint triggered|stack overflow in task|\*\*\*ERROR\*\*\* A stack overflow", text):
        out.append(Finding("stack_overflow", "bad", "Débordement de pile", "Une tâche utilise plus de pile que prévu (gros tableau local, récursion).",
                           ["Déclare les gros tableaux en static ou global.", "Augmente la pile de la tâche (xTaskCreate, dernier paramètre de taille)."]))
    if "CORRUPT HEAP" in text or re.search(r"heap_caps_\w+.*?assert failed", text):
        out.append(Finding("heap_corrupt", "bad", "Tas corrompu", "Écriture au-delà d'un tampon alloué, ou double libération.",
                           ["Cherche les strcpy/sprintf sans limite ; remplace par strlcpy/snprintf."]))
    if re.search(r"Task watchdog got triggered|task_wdt: Task watchdog", text):
        out.append(Finding("task_wdt", "bad", "Watchdog des tâches déclenché", "Une boucle tourne sans rendre la main.",
                           ["Ajoute delay(1) ou yield() dans les boucles longues.", "Évite while(!capteur.disponible()) sans délai d'expiration."]))
    for code, (name, sev, why) in RESET_REASONS.items():
        if code != "0xf" and sev != "info" and re.search(rf"rst:{code} \(", text):  # 0xf : déjà traité (brownout)
            out.append(Finding("reset_" + name.lower(), sev, f"Redémarrage : {name}", why, []))
    if boots >= 3:
        out.append(Finding("boot_loop", "bad", f"Redémarrages en boucle ({boots} démarrages vus)",
                           "La carte redémarre sans arrêt : plantage dans setup(), alimentation trop faible ou watchdog.",
                           ["Lis la cause juste avant chaque « rst: ».", "Commente les initialisations une par une dans setup() pour isoler la fautive."]))
    if re.search(r"invalid header: 0x[0-9a-f]+", text):
        out.append(Finding("invalid_header", "bad", "Aucun programme valide en flash", "Le chargeur de démarrage ne trouve pas d'application : flash effacée ou adresse de flash erronée.",
                           ["Reflashe le binaire fusionné à l'adresse 0x0, ou bootloader+partitions+application aux bonnes adresses."]))
    m = re.search(r"(?:reason|Reason)[:= ]+(\d{1,3})\b", text)
    if m and m.group(1) in WIFI_REASONS and re.search(r"wifi|WiFi|STA|disconnect", text):
        name, why = WIFI_REASONS[m.group(1)]
        out.append(Finding("wifi_" + name.lower(), "bad", f"Wi-Fi refusé : {name}", why,
                           ["Vérifie le SSID et le mot de passe (ESP32-LAB par défaut).", "Le point d'accès du S3 accepte 10 clients au maximum."]))
    if re.search(r"non d[ée]tect[ée]|not found|Could not find a valid|No I2C devices found|Failed to find|begin\(\) failed", text, re.I):
        out.append(Finding("sensor_absent", "bad", "Capteur non détecté",
                           "Le programme démarre mais le capteur ne répond pas.",
                           ["Vérifie l'alimentation (3V3 ou 5V selon le module) et la masse commune.",
                            "Sur I2C : SDA/SCL non inversés, adresse correcte (lance le job « scan I2C » depuis un worker).",
                            "Teste le capteur seul avec le projet de la bibliothèque."]))
    nan = len(re.findall(r":\s*nan\b|\bnan\b", text, re.I))
    if nan >= 2:
        out.append(Finding("nan_values", "warn", "Mesures « nan »",
                           "Le capteur répond mal : souvent un DHT sans résistance de tirage, mal alimenté, ou lu trop vite.",
                           ["DHT11/22 : résistance 10 kΩ entre DATA et 3V3, lecture toutes les 2 s minimum.", "Vérifie la broche configurée."]))
    if re.search(r"E \(\d+\) i2c|\[E\]\[Wire\.cpp|i2c.*?timeout|i2cRead returned Error", text, re.I):
        out.append(Finding("i2c_error", "bad", "Erreurs sur le bus I2C", "Les échanges I2C échouent : câblage, résistances de tirage, ou bus trop long.",
                           ["Fils courts (< 30 cm), tirages de 4,7 kΩ sur SDA et SCL.", "Un seul module par adresse sur le bus."]))
    return out


SERIAL_OK = re.compile(r"^[A-Za-z_][\w.-]{0,30}:-?\d+(\.\d+)?(\t|$)", re.M)


def verify_run(serial_log: str, expect: list[str] | None = None, forbid: list[str] | None = None, min_samples: int = 2) -> dict:
    """Juge si un programme fraîchement flashé fonctionne d'après son moniteur série.

    Verdict : ok, echec ou incertain. `expect`/`forbid` sont des expressions régulières propres au projet.
    """
    text = str(serial_log or "")
    findings = analyze_serial(text)
    bad = [f for f in findings if f.severity == "bad"]
    samples = len(SERIAL_OK.findall(text))
    reasons: list[str] = []
    missing = [e for e in (expect or []) if not re.search(e, text, re.M)]
    forbidden = [f for f in (forbid or []) if re.search(f, text, re.M)]
    if bad:
        verdict = "echec"
        reasons += [f.title for f in bad]
    elif forbidden:
        verdict = "echec"
        reasons += ["motif interdit présent : " + f for f in forbidden]
    elif missing:
        verdict = "incertain" if samples else "echec"
        reasons += ["attendu absent : " + m for m in missing]
    elif samples >= min_samples or (expect and not missing):
        verdict = "ok"
        reasons.append(f"{samples} mesure(s) valides lues sur le port série" if samples else "toutes les sorties attendues sont présentes")
    elif not text.strip():
        verdict = "incertain"
        reasons.append("aucune sortie série : vérifie la vitesse (115200 bauds) et que le moniteur est relié à la bonne carte")
    else:
        verdict = "incertain"
        reasons.append("le programme écrit sur le port série mais aucune mesure reconnue")
    return {"verdict": verdict, "samples": samples, "reasons": reasons, "findings": [f.dict() for f in findings]}


def analyze(log: str, kind: str = "auto") -> dict:
    """Point d'entrée : devine le type de journal si besoin et renvoie tous les constats."""
    t = str(log or "")
    if kind == "auto":
        if re.search(r"error:|fatal error:|arduino-cli|Compilation error|collect2", t):
            kind = "compile"
        elif re.search(r"esptool|Connecting\.\.\.|Writing at 0x|Hash of data", t):
            kind = "upload"
        else:
            kind = "serial"
    fn = {"compile": analyze_compile, "upload": analyze_upload, "serial": analyze_serial}.get(kind, analyze_serial)
    findings = fn(t)
    worst = "bad" if any(f.severity == "bad" for f in findings) else "warn" if any(f.severity == "warn" for f in findings) else "info"
    return {"kind": kind, "severity": worst if findings else "unknown", "findings": [f.dict() for f in findings],
            "summary": summarize(findings, kind)}


def summarize(findings: list[Finding], kind: str) -> str:
    if not findings:
        return {"compile": "Je ne reconnais pas d'erreur connue dans ce journal de compilation. Colle les 30 lignes autour du premier « error: ».",
                "upload": "Je ne reconnais pas d'erreur connue dans ce journal de flash.",
                "serial": "Rien d'anormal reconnu sur le moniteur série."}.get(kind, "Rien de reconnu.")
    bad = [f for f in findings if f.severity == "bad"]
    first = (bad or findings)[0]
    s = first.title + (f" (ligne {first.line})" if first.line else "") + ". " + first.explanation
    if first.fixes:
        s += " Correction : " + first.fixes[0]
    if len(bad) > 1:
        s += f" ({len(bad) - 1} autre(s) problème(s) détecté(s).)"
    return s
