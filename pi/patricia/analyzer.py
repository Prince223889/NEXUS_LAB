"""Analyse statique et correction des projets Arduino (ESP32, ESP32-S3, ESP32-C3).

Patricia lit les croquis d'un dossier de projet (.ino, .h, .hpp, .c, .cpp), y cherche les erreurs
fréquentes (Serial.begin oublié, pinMode manquant, #include absent, ancienne API LEDC, broches
interdites, accolades déséquilibrées…) et sait corriger celles qui ont une réparation sûre.

Avant toute modification, les fichiers d'origine sont copiés dans
`<projet>/.patricia_backup/<horodatage>/` ; `restore_backup` les remet en place.

Règles de sûreté : aucun fichier hors du dossier du projet, aucun lien symbolique suivi, fichiers
de plus de 512 Ko ignorés, seulement des fichiers texte .ino/.h/.hpp/.c/.cpp. Ne compile rien.

API :
    analyze_project(project_dir, board=None, build_log="") -> dict
    apply_fixes(project_dir, ids=None, build_log="", board=None) -> dict
    restore_backup(project_dir, backup_name=None) -> dict
    list_backups(project_dir) -> list[str]
"""
from __future__ import annotations

import bisect
import hashlib
import json
import os
import re
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path

from . import diagnose

SOURCE_EXTS = {".ino", ".h", ".hpp", ".c", ".cpp"}
MAX_FILE_BYTES = 512 * 1024
MAX_FILES = 200
MAX_DEPTH = 4
BACKUP_DIR = ".patricia_backup"
SKIP_DIRS = {"build", "bin", "node_modules", "__pycache__"}

SEVERITY_WEIGHT = {"bad": 15, "warn": 7, "info": 2}
SEVERITY_ORDER = {"bad": 0, "warn": 1, "info": 2}

BOARDS = {
    # valid: broches existantes ; flash : reliées à la mémoire flash/PSRAM ; strapping : lues au démarrage
    "esp32": {"name": "ESP32", "max": 39, "missing": {20, 24, 28, 29, 30, 31}, "flash": set(range(6, 12)),
              "strapping": {0, 2, 12, 15}, "input_only": set(range(34, 40)),
              "adc2": {0, 2, 4, 12, 13, 14, 15, 25, 26, 27}},
    "esp32s3": {"name": "ESP32-S3", "max": 48, "missing": {22, 23, 24, 25}, "flash": set(range(26, 33)),
                "strapping": {0, 3, 45, 46}, "input_only": set(), "adc2": set()},
    "esp32c3": {"name": "ESP32-C3", "max": 21, "missing": set(), "flash": set(range(12, 18)),
                "strapping": {2, 8, 9}, "input_only": set(), "adc2": set()},
}

STRAPPING_HINTS = {
    ("esp32", 0): "GPIO0 choisit le mode de démarrage : tiré à la masse au reset, la carte attend un flash au lieu de lancer ton programme.",
    ("esp32", 2): "GPIO2 doit rester bas ou flottant au démarrage pour pouvoir flasher ; souvent relié à la LED de la carte.",
    ("esp32", 12): "GPIO12 (MTDI) fixe la tension de la flash : tiré haut au démarrage, la carte ne démarre plus (flash en 1,8 V).",
    ("esp32", 15): "GPIO15 (MTDO) contrôle les messages de démarrage ; tiré bas, le journal de boot disparaît.",
    ("esp32s3", 0): "GPIO0 choisit le mode de démarrage (bouton BOOT).",
    ("esp32s3", 3): "GPIO3 choisit la source JTAG au démarrage.",
    ("esp32s3", 45): "GPIO45 fixe la tension de la flash (VDD_SPI) au démarrage.",
    ("esp32s3", 46): "GPIO46 participe au choix du mode de démarrage ; il doit rester bas au reset.",
    ("esp32c3", 2): "GPIO2 doit être haut au démarrage pour lancer le programme.",
    ("esp32c3", 8): "GPIO8 doit être haut au démarrage pour pouvoir flasher (souvent la LED RGB).",
    ("esp32c3", 9): "GPIO9 est le bouton BOOT : tiré bas au reset, la carte attend un flash.",
}

# (en-tête, motif d'utilisation, en-têtes qui le fournissent déjà, en-têtes à ajouter en plus)
_I2C_LIBS = ("Adafruit_SSD1306.h", "LiquidCrystal_I2C.h", "Adafruit_BME280.h", "Adafruit_BMP280.h", "Adafruit_AHTX0.h",
             "Adafruit_MPU6050.h", "Adafruit_ADS1X15.h", "Adafruit_INA219.h", "Adafruit_SHT31.h", "BH1750.h", "RTClib.h",
             "Adafruit_I2CDevice.h", "MPU6050.h", "Adafruit_PWMServoDriver.h", "U8g2lib.h", "Adafruit_BME680.h",
             "Adafruit_VL53L0X.h", "VL53L0X.h", "Adafruit_MLX90614.h", "Adafruit_TCS34725.h", "SensirionI2cScd4x.h",
             "SparkFun_SCD30_Arduino_Library.h", "QMC5883LCompass.h", "MAX30105.h")
_WIFI_LIBS = ("WebServer.h", "ESPAsyncWebServer.h", "HTTPClient.h", "WiFiClientSecure.h", "WiFiMulti.h", "ESPmDNS.h",
              "WiFiUdp.h", "WiFiClient.h", "WiFiServer.h", "WiFiAP.h", "AsyncTCP.h", "ArduinoOTA.h", "HTTPUpdate.h")
INCLUDE_RULES = [
    ("DHT.h", r"\bDHT(?:_Unified)?\s+\w+\s*[({;=\[]", ("DHT_U.h",), ()),
    ("Wire.h", r"\bWire\s*\.\s*\w+\s*\(", _I2C_LIBS, ()),
    ("WiFi.h", r"\bWiFi\s*\.\s*\w+", _WIFI_LIBS, ()),
    ("ESP32Servo.h", r"\bServo\s+\w+\s*[;=,\[(]", ("Servo.h",), ()),
    ("Adafruit_NeoPixel.h", r"\bAdafruit_NeoPixel\b", (), ()),
    ("OneWire.h", r"\bOneWire\s+\w+", ("DallasTemperature.h",), ()),
    ("DallasTemperature.h", r"\bDallasTemperature\b", (), ()),
    ("LiquidCrystal_I2C.h", r"\bLiquidCrystal_I2C\b", (), ()),
    ("Adafruit_SSD1306.h", r"\bAdafruit_SSD1306\b", (), ("Adafruit_GFX.h",)),
]
# Nom non déclaré dans un journal de compilation → en-tête à ajouter.
NAME_HEADERS = {"DHT": "DHT.h", "DHT_Unified": "DHT.h", "Wire": "Wire.h", "WiFi": "WiFi.h", "Servo": "ESP32Servo.h",
                "Adafruit_NeoPixel": "Adafruit_NeoPixel.h", "OneWire": "OneWire.h",
                "DallasTemperature": "DallasTemperature.h", "LiquidCrystal_I2C": "LiquidCrystal_I2C.h",
                "Adafruit_SSD1306": "Adafruit_SSD1306.h"}
ARDUINO_NAMES = {"Serial", "pinMode", "digitalWrite", "digitalRead", "analogRead", "analogWrite", "delay", "millis",
                 "micros", "HIGH", "LOW", "OUTPUT", "INPUT", "INPUT_PULLUP", "String", "delayMicroseconds", "byte"}
STD_HEADERS = {"stdio.h", "stdlib.h", "string.h", "stdint.h", "stdbool.h", "stddef.h", "math.h", "ctype.h", "time.h",
               "assert.h", "limits.h", "float.h", "errno.h", "cstdint", "cstring", "cstdlib", "cstdio", "cmath",
               "cstddef", "vector", "string", "algorithm", "functional", "array", "map", "memory", "utility", "queue",
               "deque", "list", "set", "unordered_map", "atomic", "mutex"}
SSID_PLACEHOLDERS = {"", "ssid", "yourssid", "yourwifissid", "yourwifi", "yournetwork", "yournetworkname", "yournetworkssid",
                     "myssid", "mywifi", "networkname", "wifiname", "votressid", "votrewifi", "nomduwifi", "nomdureseau",
                     "replacewithyourssid", "xxx", "xxxx", "xxxxx", "xxxxxx", "xxxxxxxx", "changeme", "todo"}
SECRET_PATTERNS = [
    (r"ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}", "jeton GitHub"),
    (r"sk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}", "clé d'API (OpenAI/Anthropic)"),
    (r"AKIA[0-9A-Z]{16}", "clé d'accès AWS"),
    (r"AIza[0-9A-Za-z_-]{35}", "clé d'API Google"),
    (r"xox[abpr]-[A-Za-z0-9-]{10,}", "jeton Slack"),
    (r"\d{8,10}:[A-Za-z0-9_-]{35}", "jeton de bot Telegram"),
]
WIFI_NAME = re.compile(r"wifi|wlan|ssid|softap|\bap_?pass", re.I)   # mot de passe Wi-Fi du labo : pas un secret à signaler
SECRET_NAME = re.compile(r"(token|api_?key|apikey|secret|auth|bearer|password|passwd|pass|pwd)\w*\s*(?:\[\s*\]\s*)?=\s*$", re.I)


# --------------------------------------------------------------------------- lecture sûre des fichiers

def _root(project_dir) -> Path:
    p = Path(project_dir)
    if not p.is_dir():
        raise FileNotFoundError(f"dossier de projet introuvable : {p}")
    return p.resolve()


def _inside(root: Path, p: Path) -> bool:
    """Vrai si p est dans root et qu'aucun élément du chemin n'est un lien symbolique."""
    try:
        rel = p.relative_to(root)
    except ValueError:
        return False
    cur = root
    for part in rel.parts:
        if part in ("", ".", ".."):
            return False
        cur = cur / part
        if cur.is_symlink():
            return False
    try:
        return os.path.realpath(cur).startswith(str(root) + os.sep) or Path(os.path.realpath(cur)) == root
    except OSError:
        return False


def _source_files(root: Path) -> list[str]:
    out: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        d = Path(dirpath)
        depth = len(d.relative_to(root).parts)
        dirnames[:] = sorted(n for n in dirnames if not n.startswith(".") and n not in SKIP_DIRS
                             and not (d / n).is_symlink() and depth < MAX_DEPTH)
        for name in sorted(filenames):
            p = d / name
            if p.suffix.lower() not in SOURCE_EXTS or p.is_symlink() or not p.is_file():
                continue
            try:
                if p.stat().st_size > MAX_FILE_BYTES:
                    continue
            except OSError:
                continue
            out.append(p.relative_to(root).as_posix())
            if len(out) >= MAX_FILES:
                return out
    # le croquis principal (<dossier>.ino) en premier, comme l'IDE Arduino
    main = root.name + ".ino"
    out.sort(key=lambda n: (n != main, "/" in n, not n.endswith(".ino"), n.lower()))
    return out


def _read_texts(root: Path) -> dict[str, str]:
    texts: dict[str, str] = {}
    for name in _source_files(root):
        p = root / name
        if not _inside(root, p):
            continue
        try:
            raw = p.read_bytes()
        except OSError:
            continue
        if b"\x00" in raw[:4096]:
            continue
        texts[name] = raw.decode("utf-8", errors="replace")
    return texts


def _project_meta(root: Path) -> dict:
    p = root / "project.json"
    if p.is_symlink() or not p.is_file():
        return {}
    try:
        if p.stat().st_size > MAX_FILE_BYTES:
            return {}
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def normalize_board(board) -> str | None:
    b = re.sub(r"[^a-z0-9]", "", str(board or "").lower().rsplit(":", 1)[-1])
    if not b:
        return None
    if "c3" in b:
        return "esp32c3"
    if "s3" in b:
        return "esp32s3"
    if "esp32" in b or b in ("devkit", "wroom", "wrover"):
        return "esp32"
    return None


def _board_for(root: Path, board) -> str:
    nb = normalize_board(board)
    if nb:
        return nb
    meta = _project_meta(root)
    spec = meta.get("spec") if isinstance(meta.get("spec"), dict) else {}
    for cand in (meta.get("board"), meta.get("fqbn"), spec.get("board"), spec.get("fqbn")):
        nb = normalize_board(cand)
        if nb:
            return nb
    return "esp32"


# --------------------------------------------------------------------------- découpage du code source

def _mask(text: str) -> tuple[str, list[tuple[int, int]]]:
    """Remplace commentaires et contenu des chaînes par des espaces (positions et lignes conservées).
    Renvoie aussi les intervalles (début, fin) du contenu des chaînes "…"."""
    out = list(text)
    strings: list[tuple[int, int]] = []
    n = len(text)
    i = 0

    def blank(a, b):
        for k in range(a, min(b, n)):
            if out[k] != "\n":
                out[k] = " "

    while i < n:
        c = text[i]
        nx = text[i + 1] if i + 1 < n else ""
        if c == "/" and nx == "/":
            j = text.find("\n", i)
            j = n if j < 0 else j
            blank(i, j)
            i = j
        elif c == "/" and nx == "*":
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
            blank(i, j)
            i = j
        elif c == "R" and nx == '"' and (i == 0 or not (text[i - 1].isalnum() or text[i - 1] == "_")):
            m = re.match(r'R"([^ ()\\\t\n]{0,16})\(', text[i:i + 20])
            if not m:
                i += 1
                continue
            end = text.find(")" + m.group(1) + '"', i + m.end())
            end = n if end < 0 else end
            strings.append((i + m.end(), end))
            blank(i + m.end(), end)
            i = end + len(m.group(1)) + 2
        elif c in "\"'":
            if c == "'" and i > 0 and text[i - 1].isalnum():   # séparateur de chiffres 1'000
                i += 1
                continue
            j = i + 1
            while j < n and text[j] != c and text[j] != "\n":
                j += 2 if text[j] == "\\" else 1
            j = min(j, n)
            if c == '"':
                strings.append((i + 1, j))
            blank(i + 1, j)
            i = j + 1
        else:
            i += 1
    return "".join(out), strings


@dataclass
class _Src:
    name: str
    text: str
    masked: str = ""
    code: str = ""                  # masqué et sans lignes de préprocesseur
    strings: list = field(default_factory=list)
    nl: list = field(default_factory=list)
    opens: list = field(default_factory=list)
    closes: list = field(default_factory=list)
    includes: list = field(default_factory=list)   # (en-tête, ligne)

    def __post_init__(self):
        self.masked, self.strings = _mask(self.text)
        self.code = re.sub(r"(?m)^[ \t]*#.*$", lambda m: " " * len(m.group(0)), self.masked)
        self.nl = [m.start() for m in re.finditer("\n", self.text)]
        self.opens = [m.start() for m in re.finditer(r"\{", self.code)]
        self.closes = [m.start() for m in re.finditer(r"\}", self.code)]
        for m in re.finditer(r'(?m)^[ \t]*#[ \t]*include[ \t]*([<"])', self.masked):
            close = ">" if m.group(1) == "<" else '"'
            end = self.text.find(close, m.end())
            eol = self.text.find("\n", m.end())
            if end > 0 and (eol < 0 or end < eol):
                self.includes.append((self.text[m.end():end].strip(), self.line(m.start())))

    @property
    def is_ino(self) -> bool:
        return self.name.endswith(".ino")

    def line(self, pos: int) -> int:
        return bisect.bisect_right(self.nl, pos - 1) + 1 if pos > 0 else 1

    def depth(self, pos: int) -> int:
        return bisect.bisect_left(self.opens, pos) - bisect.bisect_left(self.closes, pos)

    def header_names(self) -> set[str]:
        return {h for h, _ in self.includes} | {h.rsplit("/", 1)[-1] for h, _ in self.includes}


@dataclass
class _Call:
    src: _Src
    name: str
    pos: int
    open: int
    close: int
    args: list           # texte masqué (sans commentaires)
    raw: list            # texte d'origine
    obj: str = ""

    @property
    def line(self) -> int:
        return self.src.line(self.pos)


def _parse_args(src: _Src, open_idx: int):
    depth, start = 0, open_idx + 1
    args, raw = [], []
    code = src.masked
    for k in range(open_idx, len(code)):
        ch = code[k]
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
            if depth == 0:
                args.append(code[start:k].strip())
                raw.append(src.text[start:k].strip())
                if args == [""]:
                    args, raw = [], []
                return args, raw, k
        elif ch == "," and depth == 1:
            args.append(code[start:k].strip())
            raw.append(src.text[start:k].strip())
            start = k + 1
    return None, None, None


def _calls(srcs: list[_Src], names: str, member: bool = False) -> list[_Call]:
    """Appels de fonctions libres (`names` = alternative regex) ou de méthodes (`obj.nom(`) si member."""
    if member:
        rx = re.compile(r"\b(\w+)\s*\.\s*(" + names + r")\s*\(")
    else:
        rx = re.compile(r"(?<![\w.>:])(" + names + r")\s*\(")
    out = []
    for s in srcs:
        for m in rx.finditer(s.code):
            args, raw, close = _parse_args(s, m.end() - 1)
            if args is None:
                continue
            if member:
                out.append(_Call(s, m.group(2), m.start(), m.end() - 1, close, args, raw, m.group(1)))
            else:
                before = s.code[max(0, m.start() - 40):m.start()]
                if re.search(r"\b(void|int|bool|uint8_t|float|long|static|inline)\s+$", before):
                    continue   # définition de fonction, pas un appel
                out.append(_Call(s, m.group(1), m.start(), m.end() - 1, close, args, raw))
    return out


def _func_body(srcs: list[_Src], fname: str):
    """(src, position de « { », position de « } » ou None) de `void fname()`."""
    rx = re.compile(r"\bvoid\s+" + fname + r"\s*\(\s*(?:void)?\s*\)\s*\{")
    for s in srcs:
        m = rx.search(s.code)
        if m:
            o = m.end() - 1
            depth = 0
            for k in range(o, len(s.code)):
                if s.code[k] == "{":
                    depth += 1
                elif s.code[k] == "}":
                    depth -= 1
                    if depth == 0:
                        return s, o, k
            return s, o, None
    return None


def _constants(srcs: list[_Src]) -> dict[str, int]:
    found: dict[str, set] = {}
    for s in srcs:
        for m in re.finditer(r"(?m)^[ \t]*#[ \t]*define[ \t]+(\w+)[ \t]+\(?[ \t]*(?:GPIO_NUM_)?(\d+)[ \t]*\)?[ \t]*$", s.masked):
            found.setdefault(m.group(1), set()).add(int(m.group(2)))
        rx = r"(?<![\w.])((?:(?:static|const|constexpr|volatile|unsigned|signed)\s+)*)(?:int|uint8_t|int8_t|uint16_t|int16_t|uint32_t|int32_t|byte|short|long|size_t|gpio_num_t)\s+(\w+)\s*=\s*\(?\s*(?:GPIO_NUM_)?(\d+)\s*\)?\s*[;,]"
        for m in re.finditer(rx, s.code):
            is_const = "const" in m.group(1)
            if is_const or s.depth(m.start()) == 0:
                found.setdefault(m.group(2), set()).add(int(m.group(3)))
            else:
                found.setdefault(m.group(2), set()).add(-1)   # variable locale : valeur inconnue
    consts = {k: next(iter(v)) for k, v in found.items() if len(v) == 1 and -1 not in v}
    # une variable réaffectée ailleurs n'est pas une constante
    for name in list(consts):
        n_assign = sum(len(re.findall(r"(?<![\w.])" + re.escape(name) + r"\s*(?:=(?!=)|\+\+|--|[-+*/|&]=)", s.code)) for s in srcs)
        if n_assign > 1:
            del consts[name]
    return consts


def _simple(expr: str) -> str:
    e = re.sub(r"\s+", "", expr or "")
    while e.startswith("(") and e.endswith(")") and e.count("(") == 1:
        e = e[1:-1]
    e = re.sub(r"^\((?:u?int\d+_t|int|byte|gpio_num_t)\)", "", e)
    e = re.sub(r"^static_cast<\w+>\((.*)\)$", r"\1", e)
    return e


def _value(expr: str, consts: dict[str, int]) -> int | None:
    e = _simple(expr)
    m = re.fullmatch(r"(\d+)[uUlL]*", e) or re.fullmatch(r"GPIO_NUM_(\d+)", e)
    if m:
        return int(m.group(1))
    return consts.get(e)


def _is_simple(expr: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z_]\w*|\d+[uUlL]*", _simple(expr)))


# --------------------------------------------------------------------------- constats

@dataclass
class _F:
    id: str
    severity: str
    title: str
    explanation: str
    file: str | None = None
    line: int | None = None
    fix_summary: str = ""
    fix: tuple | None = None
    action: dict | None = None

    def public(self) -> dict:
        d = {"id": self.id, "severity": self.severity, "title": self.title, "explanation": self.explanation,
             "file": self.file, "line": self.line, "fixable": self.fix is not None, "fix_summary": self.fix_summary}
        if self.action:
            d["action"] = self.action
        return d


class _Ctx:
    def __init__(self, texts: dict[str, str], board: str):
        self.board = board if board in BOARDS else "esp32"
        self.info = BOARDS[self.board]
        self.srcs = [_Src(n, t) for n, t in texts.items()]
        self.inos = [s for s in self.srcs if s.is_ino]
        self.main = self.inos[0] if self.inos else (self.srcs[0] if self.srcs else None)
        self.consts = _constants(self.srcs)
        self.setup = _func_body(self.srcs, "setup")
        self.loop = _func_body(self.srcs, "loop")
        self.findings: list[_F] = []
        self.uses_wifi = any(re.search(r"\bWiFi\s*\.\s*\w+|\besp_now_init\b", s.code) for s in self.srcs)

    def add(self, f: _F):
        if all(x.id != f.id for x in self.findings):
            self.findings.append(f)

    def has(self, rx: str) -> bool:
        return any(re.search(rx, s.code) for s in self.srcs)

    def first(self, rx: str):
        for s in self.srcs:
            m = re.search(rx, s.code)
            if m:
                return s, m
        return None

    def provides(self, src: _Src, headers: set[str]) -> bool:
        """Vrai si `src` voit l'un des en-têtes (directement, via un .ino frère, ou via un .h local)."""
        pool = [src] + ([s for s in self.inos if s is not src] if src.is_ino else [])
        seen = set()
        while pool:
            s = pool.pop()
            if s.name in seen:
                continue
            seen.add(s.name)
            if s.header_names() & headers:
                return True
            for h, _ in s.includes:
                local = next((x for x in self.srcs if x.name == h or x.name.endswith("/" + h)), None)
                if local:
                    pool.append(local)
        return False


def _setup_fix(ctx: _Ctx, stmt: str, prio: int):
    return ("setup_insert", stmt, prio) if ctx.setup else None


def _check_structure(ctx: _Ctx):
    if not ctx.inos:
        return
    if not ctx.setup:
        ctx.add(_F(f"missing-setup:{ctx.main.name}", "bad", "Fonction setup() absente",
                   "Tout croquis Arduino doit définir void setup() (exécutée une fois au démarrage) et void loop().",
                   ctx.main.name, None, "Ajoute « void setup() { … } » avec l'initialisation de tes capteurs."))
    if not ctx.loop:
        fixable = ctx.setup is not None
        ctx.add(_F(f"missing-loop:{ctx.main.name}", "bad", "Fonction loop() absente",
                   "Sans void loop(), l'édition des liens échoue (« undefined reference to loop »).",
                   ctx.main.name, None,
                   "J'ajoute une fonction loop() vide à la fin du fichier." if fixable else "Ajoute « void loop() { } ».",
                   ("add_loop", ctx.setup[0].name) if fixable else None))


def _check_balance(ctx: _Ctx):
    for s in ctx.srcs:
        for o, c, label, plural in (("{", "}", "accolade", "Accolades"), ("(", ")", "parenthèse", "Parenthèses")):
            stack: list[int] = []
            extra = None
            for m in re.finditer(re.escape(o) + "|" + re.escape(c), s.code):
                if m.group(0) == o:
                    stack.append(m.start())
                elif stack:
                    stack.pop()
                elif extra is None:
                    extra = m.start()
            kind = "braces" if o == "{" else "parens"
            if extra is not None:
                ctx.add(_F(f"unbalanced-{kind}:{s.name}", "bad", f"{plural} déséquilibrées dans {s.name}",
                           f"Une {label} fermante « {c} » n'a pas d'ouvrante correspondante (vers la ligne {s.line(extra)}).",
                           s.name, s.line(extra), f"Supprime la « {c} » en trop ou ajoute l'ouvrante qui manque plus haut."))
            elif stack:
                ln = s.line(stack[0] if o == "{" else stack[-1])
                ctx.add(_F(f"unbalanced-{kind}:{s.name}", "bad", f"{plural} déséquilibrées dans {s.name}",
                           f"{len(stack)} {label}(s) « {o} » jamais refermée(s) ; la première ouverte reste ouverte vers la ligne {ln}.",
                           s.name, ln, f"Ajoute la « {c} » manquante ; l'indentation automatique (Ctrl+T) aide à la repérer."))


def _check_serial(ctx: _Ctx):
    use = ctx.first(r"\bSerial\s*\.\s*(?:print|println|printf|write|read\w*|available|parseInt|parseFloat|peek|flush)\s*\(")
    if use and not ctx.has(r"\bSerial\s*\.\s*begin\s*\("):
        s, m = use
        fname = ctx.setup[0].name if ctx.setup else s.name
        ctx.add(_F(f"missing-serial-begin:{fname}", "warn", "Serial.begin() manquant",
                   "Le programme écrit sur le port série mais ne l'ouvre jamais : rien ne s'affichera dans le moniteur série.",
                   s.name, s.line(m.start()), "J'ajoute « Serial.begin(115200); » en première ligne de setup().",
                   _setup_fix(ctx, "Serial.begin(115200);", 9)))


def _check_wire(ctx: _Ctx):
    use = ctx.first(r"\bWire\s*\.\s*(?!begin\s*\()\w+\s*\(")
    if use and not ctx.has(r"\bWire\s*\.\s*begin\s*\("):
        s, m = use
        fname = ctx.setup[0].name if ctx.setup else s.name
        ctx.add(_F(f"missing-wire-begin:{fname}", "warn", "Wire.begin() manquant",
                   "Le bus I2C est utilisé sans être démarré : les échanges avec les capteurs échouent tant qu'aucune bibliothèque ne l'a initialisé.",
                   s.name, s.line(m.start()), "J'ajoute « Wire.begin(); » au début de setup() (SDA 21 / SCL 22 sur ESP32 DevKit).",
                   _setup_fix(ctx, "Wire.begin();", 8)))


def _check_includes(ctx: _Ctx):
    for header, usage, suppress, extra in INCLUDE_RULES:
        for s in ctx.srcs:
            m = re.search(usage, s.code)
            if not m:
                continue
            if ctx.provides(s, {header, *suppress}):
                continue
            target = s
            hs = [header, *[e for e in extra if not ctx.provides(s, {e})]]
            ctx.add(_F(f"missing-include:{header}:{target.name}", "bad", f"#include <{header}> manquant",
                       f"{header[:-2]} est utilisé dans {s.name} sans inclure son en-tête : le compilateur ne connaît pas ce nom.",
                       s.name, s.line(m.start()), "J'ajoute " + " et ".join(f"« #include <{h}> »" for h in hs) + " en haut du fichier.",
                       ("include", target.name, tuple(hs))))
            break
    # .cpp/.c : pas d'Arduino.h implicite
    for s in ctx.srcs:
        if not s.name.endswith((".cpp", ".c")):
            continue
        m = re.search(r"\b(" + "|".join(sorted(ARDUINO_NAMES)) + r")\b", s.code)
        if not m:
            continue
        libs = {h for h, _ in s.includes if h not in STD_HEADERS and not any(x.name.endswith(h) for x in ctx.srcs)}
        if libs or ctx.provides(s, {"Arduino.h"}):
            continue
        ctx.add(_F(f"missing-include:Arduino.h:{s.name}", "bad", f"#include <Arduino.h> manquant dans {s.name}",
                   f"Un fichier .cpp n'inclut pas Arduino.h automatiquement (contrairement au .ino) : « {m.group(1)} » y est inconnu.",
                   s.name, s.line(m.start()), "J'ajoute « #include <Arduino.h> » en haut du fichier.",
                   ("include", s.name, ("Arduino.h",))))
    # Servo.h n'existe pas pour ESP32
    for s in ctx.srcs:
        for h, ln in s.includes:
            if h == "Servo.h" and not ctx.provides(s, {"ESP32Servo.h"}):
                ctx.add(_F(f"servo-header:{s.name}", "bad", "Servo.h n'existe pas sur ESP32",
                           "La bibliothèque Servo d'origine ne vise que les cartes AVR ; sur ESP32 on utilise ESP32Servo (même API).",
                           s.name, ln, "Je remplace « #include <Servo.h> » par « #include <ESP32Servo.h> ».",
                           ("replace_include", s.name, "Servo.h", "ESP32Servo.h"),
                           {"type": "install_library", "library": "ESP32Servo"}))


def _ledc_plan(ctx: _Ctx):
    """Conversion de l'API LEDC 2.x vers 3.x. Renvoie (fichier, modifications) ou (None, raison)."""
    setups = _calls(ctx.srcs, "ledcSetup")
    attaches = _calls(ctx.srcs, "ledcAttachPin")
    detaches = _calls(ctx.srcs, "ledcDetachPin")
    users = _calls(ctx.srcs, "ledcWrite|ledcWriteTone|ledcWriteNote|ledcRead|ledcReadFreq")
    files = {c.src.name for c in setups + attaches + detaches + users}
    if len(files) != 1:
        return None, "les appels LEDC sont répartis dans plusieurs fichiers"
    key = lambda e: str(_value(e, ctx.consts)) if _value(e, ctx.consts) is not None else _simple(e)  # noqa: E731
    chans: dict[str, _Call] = {}
    for c in setups:
        if len(c.args) != 3 or not _is_simple(c.args[0]):
            return None, "un ledcSetup() utilise un canal calculé"
        if key(c.args[0]) in chans:
            return None, "le même canal est configuré deux fois"
        before = c.src.code[:c.pos].rstrip()
        after = c.src.code[c.close + 1:].lstrip()
        if (before and before[-1] not in ";{}") or not after.startswith(";"):
            return None, "un ledcSetup() n'est pas une instruction isolée"
        chans[key(c.args[0])] = c
    pin_of: dict[str, str] = {}
    for c in attaches:
        if len(c.args) != 2 or not _is_simple(c.args[0]) or not _is_simple(c.args[1]):
            return None, "un ledcAttachPin() utilise une broche ou un canal calculé"
        k = key(c.args[1])
        if k not in chans:
            return None, f"le canal {c.args[1]} n'a pas de ledcSetup()"
        if k in pin_of:
            return None, f"le canal {c.args[1]} pilote plusieurs broches"
        pin_of[k] = c.raw[0]
    if set(pin_of) != set(chans):
        return None, "un canal configuré n'est relié à aucune broche"
    for c in users:
        if not c.args or key(c.args[0]) not in pin_of:
            return None, f"{c.name}() ligne {c.line} utilise un canal qui n'est pas une constante connue"
    edits = []
    s = setups[0].src if setups else (attaches + detaches + users)[0].src
    for c in setups:
        semi = s.code.index(";", c.close)
        ls = s.text.rfind("\n", 0, c.pos) + 1
        le = s.text.find("\n", semi)
        le = len(s.text) if le < 0 else le + 1
        if s.text[ls:c.pos].strip() == "" and s.code[semi + 1:le].strip() == "":
            edits.append((ls, le, ""))
        else:
            edits.append((c.pos, semi + 1, ""))
    for c in attaches:
        st = chans[key(c.args[1])]
        edits.append((c.pos, c.close + 1, f"ledcAttach({c.raw[0]}, {st.raw[1]}, {st.raw[2]})"))
    for c in detaches:
        edits.append((c.pos, c.open, "ledcDetach"))
    for c in users:
        a0 = c.src.text.find(c.raw[0], c.open)
        edits.append((a0, a0 + len(c.raw[0]), pin_of[key(c.args[0])]))
    return s.name, sorted(edits)


def _check_ledc(ctx: _Ctx):
    hit = ctx.first(r"(?<![\w.])(ledcSetup|ledcAttachPin|ledcDetachPin)\s*\(")
    if not hit:
        return
    s, m = hit
    fname, plan = _ledc_plan(ctx)
    expl = ("Arduino-ESP32 3.x (installé sur le Pi) a supprimé ledcSetup()/ledcAttachPin() : "
            "on écrit ledcAttach(broche, fréquence, résolution) puis ledcWrite(broche, valeur).")
    if fname:
        ctx.add(_F(f"ledc-api-v3:{fname}", "bad", "Ancienne API LEDC (Arduino-ESP32 2.x)", expl, s.name, s.line(m.start()),
                   "Je remplace ledcSetup + ledcAttachPin par ledcAttach(broche, fréquence, résolution) et le canal par la broche dans ledcWrite.",
                   ("ledc",)))
    else:
        ctx.add(_F(f"ledc-api-v3:{s.name}", "bad", "Ancienne API LEDC (Arduino-ESP32 2.x)",
                   expl + f" Conversion automatique impossible : {plan}.", s.name, s.line(m.start()),
                   "À la main : ledcAttach(broche, f, r) à la place de ledcSetup/ledcAttachPin, et ledcWrite(broche, v)."))


def _pin_uses(ctx: _Ctx):
    """[(valeur, expression, sortie?, appel)]"""
    uses = []
    for c in _calls(ctx.srcs, "pinMode|digitalWrite|digitalRead|analogRead|analogWrite|ledcAttach|ledcAttachPin|ledcAttachChannel|attachInterrupt"):
        if not c.args:
            continue
        expr = c.args[0]
        if c.name == "attachInterrupt":
            m = re.fullmatch(r"digitalPinToInterrupt\s*\((.*)\)", expr.strip())
            if not m:
                continue
            expr = m.group(1)
        out = c.name in ("digitalWrite", "analogWrite", "ledcAttach", "ledcAttachPin", "ledcAttachChannel") or \
            (c.name == "pinMode" and len(c.args) > 1 and "OUTPUT" in c.args[1])
        uses.append((_value(expr, ctx.consts), expr, out, c))
    servos = set()
    for s in ctx.srcs:
        servos |= set(re.findall(r"\bServo\s+(\w+)", s.code))
    for c in _calls(ctx.srcs, "attach", member=True):
        if c.obj in servos and c.args:
            uses.append((_value(c.args[0], ctx.consts), c.args[0], True, c))
    for s in ctx.srcs:
        for rx, idx, out in ((r"\b(DHT)\s+\w+\s*\(", 0, False), (r"\b(OneWire)\s+\w+\s*\(", 0, False),
                             (r"\b(Adafruit_NeoPixel)\s+\w+\s*\(", 1, True)):
            for m in re.finditer(rx, s.code):
                args, raw, close = _parse_args(s, m.end() - 1)
                if args and len(args) > idx:
                    uses.append((_value(args[idx], ctx.consts), args[idx], out,
                                 _Call(s, m.group(1), m.start(), m.end() - 1, close, args, raw)))
    return uses


def _check_pins(ctx: _Ctx):
    b, info = ctx.board, ctx.info
    uses = _pin_uses(ctx)
    done: set[int] = set()
    for val, expr, _out, c in uses:
        if val is None or val in done:
            continue
        done.add(val)
        outs = [u for u in uses if u[0] == val and u[2]]
        where = (c.src.name, c.line)
        label = f"GPIO{val}" + (f" ({_simple(expr)})" if not _simple(expr).isdigit() else "")
        if val > info["max"] or val in info["missing"]:
            ctx.add(_F(f"pin-invalid:{val}", "bad", f"{label} n'existe pas sur {info['name']}",
                       f"Le {info['name']} n'a pas de broche {val} (broches 0 à {info['max']}"
                       + (f", sauf {', '.join(map(str, sorted(info['missing'])))}" if info["missing"] else "") + ").",
                       *where, "Choisis une broche existante libre et corrige le câblage."))
            continue
        if val in info["flash"]:
            ctx.add(_F(f"pin-flash:{val}", "bad", f"{label} est réservée à la mémoire flash",
                       f"Sur {info['name']}, les GPIO {min(info['flash'])} à {max(info['flash'])} sont reliées à la flash (ou PSRAM) : les utiliser fait planter la carte.",
                       *where, "Déplace ce fil sur une autre broche (par ex. 16, 17, 18, 19, 21, 22, 23 sur ESP32)."))
            continue
        if val in info["input_only"] and outs:
            o = outs[0][3]
            ctx.add(_F(f"pin-input-only:{val}", "bad", f"{label} ne peut être qu'une entrée",
                       "Sur ESP32, les GPIO 34 à 39 n'ont pas d'étage de sortie (ni pull-up/pull-down) : digitalWrite n'y fait rien.",
                       o.src.name, o.line, "Utilise une broche de sortie (par ex. 25, 26, 27, 32, 33) pour cette LED/ce relais."))
        if val in info["adc2"] and ctx.uses_wifi:
            ar = next((u[3] for u in uses if u[0] == val and u[3].name == "analogRead"), None)
            if ar:
                ctx.add(_F(f"pin-adc2-wifi:{val}", "bad", f"{label} : ADC2 inutilisable avec le Wi-Fi",
                           "Sur ESP32, le Wi-Fi occupe l'ADC2 : analogRead() sur une broche ADC2 renvoie une erreur ou 0 dès que le Wi-Fi est actif.",
                           ar.src.name, ar.line, "Branche le capteur analogique sur une broche ADC1 : GPIO 32, 33, 34, 35, 36 ou 39."))
        if val in info["strapping"] and not _boot_button(b, val, uses):
            ctx.add(_F(f"pin-strapping:{val}", "warn", f"{label} est une broche de démarrage",
                       STRAPPING_HINTS.get((b, val), "Cette broche est lue au démarrage.") +
                       " Un montage qui la force au reset peut empêcher la carte de démarrer ou d'être flashée.",
                       *where, "Si possible, utilise une autre broche ; sinon évite toute résistance ou charge qui la tire au démarrage."))


def _boot_button(board: str, val: int, uses) -> bool:
    """Lecture du bouton BOOT (GPIO0, ou GPIO9 sur C3) en INPUT_PULLUP : usage normal, pas d'alerte."""
    if val != (9 if board == "esp32c3" else 0):
        return False
    mine = [u for u in uses if u[0] == val]
    return all(not u[2] and u[3].name in ("pinMode", "digitalRead", "attachInterrupt") for u in mine) and \
        any(u[3].name == "pinMode" and len(u[3].args) > 1 and "INPUT_PULLUP" in u[3].args[1] for u in mine)


def _check_missing_modes(ctx: _Ctx):
    modes = _calls(ctx.srcs, "pinMode")
    old_ledc = ctx.has(r"(?<![\w.])(ledcSetup|ledcAttachPin)\s*\(")
    if all(_is_simple(c.args[0]) for c in modes if c.args):
        have = {(_value(c.args[0], ctx.consts) if _value(c.args[0], ctx.consts) is not None else _simple(c.args[0]))
                for c in modes if c.args}
        seen = set()
        for c in _calls(ctx.srcs, "digitalWrite|analogWrite"):
            if not c.args or not _is_simple(c.args[0]):
                continue
            v = _value(c.args[0], ctx.consts)
            if v is None or v in have or v in seen:
                continue
            seen.add(v)
            expr = _simple(c.args[0])
            sev = "bad" if c.name == "digitalWrite" else "warn"
            ctx.add(_F(f"missing-pinmode:{expr}:{c.src.name}", sev, f"pinMode({expr}, OUTPUT) manquant",
                       f"{c.name}() pilote la broche {expr} sans qu'elle soit déclarée en sortie : "
                       + ("elle reste en entrée et la LED/le relais ne réagit pas." if sev == "bad" else "le comportement dépend de la version du cœur."),
                       c.src.name, c.line, f"J'ajoute « pinMode({expr}, OUTPUT); » dans setup().",
                       _setup_fix(ctx, f"pinMode({expr}, OUTPUT);", 5)))
    if old_ledc:
        return
    att = _calls(ctx.srcs, "ledcAttach|ledcAttachChannel")
    if not all(c.args and _is_simple(c.args[0]) for c in att):
        return
    have = {_value(c.args[0], ctx.consts) for c in att}
    seen = set()
    for c in _calls(ctx.srcs, "ledcWrite"):
        if not c.args or not _is_simple(c.args[0]):
            continue
        v = _value(c.args[0], ctx.consts)
        if v is None or v in have or v in seen:
            continue
        seen.add(v)
        expr = _simple(c.args[0])
        ctx.add(_F(f"missing-ledcattach:{expr}:{c.src.name}", "bad", f"ledcAttach({expr}, …) manquant",
                   f"ledcWrite({expr}, …) ne fait rien si la broche n'a pas été reliée au PWM par ledcAttach().",
                   c.src.name, c.line, f"J'ajoute « ledcAttach({expr}, 5000, 8); » (5 kHz, 8 bits) dans setup().",
                   _setup_fix(ctx, f"ledcAttach({expr}, 5000, 8);", 5)))


def _check_blocking(ctx: _Ctx):
    if not ctx.loop or ctx.loop[2] is None:
        return
    if not ctx.has(r"handleClient\s*\(|\bWiFiServer\b|(?<!\w)WebServer\b|\bserver\s*\.\s*available\s*\("):
        return
    s, o, c = ctx.loop
    for m in re.finditer(r"(?<![\w.])delay\s*\(", s.code[o:c]):
        args, _, _ = _parse_args(s, o + m.end() - 1)
        v = _value(args[0], ctx.consts) if args else None
        if v is not None and v >= 1000:
            ctx.add(_F(f"blocking-delay:{s.name}", "warn", "delay() trop long dans un serveur web",
                       f"delay({args[0]}) bloque loop() : pendant ce temps le serveur ne répond plus et la page web semble figée.",
                       s.name, s.line(o + m.start()), "Remplace delay() par un test sur millis() (« if (millis() - dernier > 2000) { … } »)."))
            return


def _string_at(s: _Src, quote_pos: int):
    for a, b in s.strings:
        if a == quote_pos + 1:
            return s.text[a:b]
    return None


def _check_wifi_ssid(ctx: _Ctx):
    for c in _calls(ctx.srcs, "begin", member=True):
        if c.obj != "WiFi" or not c.args:
            continue
        ssid = None
        raw0 = c.raw[0]
        if raw0.startswith('"'):
            ssid = _string_at(c.src, c.src.text.find('"', c.open))
        elif _is_simple(raw0):
            name = re.escape(_simple(raw0))
            for s in ctx.srcs:
                m = re.search(r"\b" + name + r"\s*(?:\[\s*\d*\s*\]\s*)?=\s*\"", s.masked) or \
                    re.search(r"(?m)^[ \t]*#[ \t]*define[ \t]+" + name + r"[ \t]+\"", s.masked)
                if m:
                    ssid = _string_at(s, m.end() - 1)
                    break
        if ssid is None:
            continue
        if re.sub(r"[^a-z0-9]", "", ssid.lower()) in SSID_PLACEHOLDERS:
            ctx.add(_F(f"wifi-placeholder:{c.src.name}", "warn", "Nom de réseau Wi-Fi à remplir",
                       f"WiFi.begin() reçoit « {ssid} », qui ressemble à un exemple : la carte ne trouvera aucun réseau (raison 201 NO_AP_FOUND).",
                       c.src.name, c.line, "Mets le vrai nom du réseau (par ex. le point d'accès du MASTER) et son mot de passe."))
            return


def _check_secrets(ctx: _Ctx):
    for s in ctx.srcs:
        for a, b in s.strings:
            val = s.text[a:b]
            kind = next((k for rx, k in SECRET_PATTERNS if re.search(rx, val)), None)
            if not kind and len(val) >= 20 and " " not in val and re.search(r"[A-Za-z]", val) and re.search(r"\d", val):
                prefix = s.masked[max(0, a - 120):a - 1].rsplit("\n", 1)[-1]   # même ligne seulement
                sm = SECRET_NAME.search(prefix)
                if sm and not WIFI_NAME.search(prefix):
                    kind = "clé ou mot de passe"
            if kind:
                ln = s.line(a)
                ctx.add(_F(f"hardcoded-secret:{s.name}:{hashlib.sha1(val.encode()).hexdigest()[:8]}", "warn", f"Secret écrit en clair ({kind})",
                           f"Ligne {ln}, une chaîne ressemble à un {kind} ({val[:4]}…). Elle partira avec le code (GitHub, partage, APK).",
                           s.name, ln, "Déplace-le dans un fichier secrets.h non partagé, et régénère-le s'il a déjà été publié."))


def _merge_build_log(ctx: _Ctx, build_log: str):
    if not str(build_log or "").strip():
        return
    rep = diagnose.analyze(build_log, "compile")
    names = {s.name.rsplit("/", 1)[-1]: s for s in ctx.srcs}
    for d in rep.get("findings", []):
        ev = d.get("evidence", "")
        line = d.get("line")
        fm = re.search(r"([\w.+-]+\.(?:ino|cpp|c|h|hpp)):\d+", ev)
        src = names.get(fm.group(1)) if fm else None
        fname = src.name if src else None
        code = d.get("code", "error")
        # nom inconnu → #include manquant ?
        nm = re.search(r"'([\w:]+)' (?:was not declared in this scope|does not name a type|has not been declared)", ev)
        if nm:
            name = nm.group(1)
            header = NAME_HEADERS.get(name)
            target = src or ctx.main
            if not header and name in ARDUINO_NAMES and target and target.name.endswith((".cpp", ".c")):
                header = "Arduino.h"
            if header and target:
                if any(f.id.startswith(f"missing-include:{header}:") for f in ctx.findings):
                    continue
                if not ctx.provides(target, {header}):
                    ctx.add(_F(f"missing-include:{header}:{target.name}", "bad", f"#include <{header}> manquant",
                               f"La compilation ne connaît pas « {name} » : il manque l'en-tête {header}.",
                               target.name, line, f"J'ajoute « #include <{header}> » en haut du fichier.",
                               ("include", target.name, (header,))))
                    continue
        if code == "ledc_api_v3" and any(f.id.startswith("ledc-api-v3:") for f in ctx.findings):
            continue
        if code == "braces" and any(f.id.startswith("unbalanced-braces:") for f in ctx.findings):
            continue
        if code == "missing_library":
            hm = re.search(r"([\w./+-]+): No such file", ev)
            fid = f"missing-library:{hm.group(1) if hm else '?'}"
        else:
            fid = f"build-{code}:{fname or '?'}:{line or 0}"
        fixes = d.get("fixes") or []
        ctx.add(_F(fid, d.get("severity", "bad"), d.get("title", "Erreur de compilation"), d.get("explanation", ""),
                   fname, line, fixes[0] if fixes else "", None, d.get("auto_fix")))


CHECKS = (_check_structure, _check_balance, _check_includes, _check_serial, _check_wire, _check_ledc,
          _check_missing_modes, _check_pins, _check_blocking, _check_wifi_ssid, _check_secrets)


def _analyze_texts(texts: dict[str, str], board: str, build_log: str = "") -> list[_F]:
    ctx = _Ctx(texts, board)
    for check in CHECKS:
        check(ctx)
    _merge_build_log(ctx, build_log)
    order = {s.name: i for i, s in enumerate(ctx.srcs)}
    ctx.findings.sort(key=lambda f: (SEVERITY_ORDER.get(f.severity, 3), order.get(f.file, 99), f.line or 0, f.id))
    return ctx.findings


def _score(findings: list[_F]) -> int:
    return max(0, 100 - sum(SEVERITY_WEIGHT.get(f.severity, 0) for f in findings))


def _summary(pid: str, board: str, files: list[str], findings: list[_F]) -> str:
    bname = BOARDS[board]["name"]
    if not files:
        return f"Le projet {pid} ne contient aucun croquis (.ino, .h, .cpp) à analyser."
    if not findings:
        return f"Projet {pid} ({bname}) : aucun problème détecté dans {len(files)} fichier(s)."
    bad = sum(f.severity == "bad" for f in findings)
    warn = sum(f.severity == "warn" for f in findings)
    fix = sum(f.fix is not None for f in findings)
    parts = []
    if bad:
        parts.append(f"{bad} grave(s)")
    if warn:
        parts.append(f"{warn} à surveiller")
    s = f"Projet {pid} ({bname}) : {len(findings)} problème(s) trouvé(s)"
    s += f" ({', '.join(parts)})" if parts else ""
    s += f", dont {fix} que je peux corriger automatiquement." if fix else ", aucun corrigeable automatiquement."
    return s


def analyze_project(project_dir: Path, board: str | None = None, build_log: str = "") -> dict:
    """Analyse un dossier de projet et renvoie les constats (voir l'en-tête du module)."""
    root = _root(project_dir)
    b = _board_for(root, board)
    meta = _project_meta(root)
    pid = str(meta.get("id") or root.name)
    texts = _read_texts(root)
    findings = _analyze_texts(texts, b, build_log)
    if not texts:
        findings = [_F("no-sketch", "bad", "Aucun croquis", "Le dossier ne contient aucun fichier .ino, .h ou .cpp lisible.",
                       None, None, "Génère ou copie le code du projet dans ce dossier.")]
    return {"project": pid, "board": b, "files": list(texts), "findings": [f.public() for f in findings],
            "summary": _summary(pid, b, list(texts), findings), "score": _score(findings)}


# --------------------------------------------------------------------------- corrections

def _indent_after(text: str, brace: int) -> str:
    m = re.search(r"\n([ \t]+)\S", text[brace:brace + 400])
    return m.group(1) if m else "  "


def _do_fix(texts: dict[str, str], ctx: _Ctx, fix: tuple):
    """Renvoie {fichier: nouveau_texte} ou une chaîne d'erreur."""
    kind = fix[0]
    if kind == "setup_insert":
        if not ctx.setup:
            return "setup() introuvable"
        s, o, _c = ctx.setup
        t = s.text
        ind = _indent_after(t, o)
        rest = t[o + 1:]
        stripped = rest.lstrip(" \t")
        if stripped.startswith("\n"):
            new = t[:o + 1] + "\n" + ind + fix[1] + rest
        elif stripped.startswith("}"):
            new = t[:o + 1] + "\n" + ind + fix[1] + "\n" + stripped
        else:
            new = t[:o + 1] + "\n" + ind + fix[1] + "\n" + ind + stripped
        return {s.name: new}
    if kind == "include":
        name, headers = fix[1], fix[2]
        s = next((x for x in ctx.srcs if x.name == name), None)
        if not s:
            return "fichier introuvable"
        t = s.text
        add = "".join(f"#include <{h}>\n" for h in headers if h not in s.header_names())
        if not add:
            return {}
        if s.includes:
            last = max(ln for _, ln in s.includes)
            pos = s.nl[last - 1] + 1 if last - 1 < len(s.nl) else len(t)
            if pos >= len(t) and not t.endswith("\n"):
                add = "\n" + add
        else:
            m = re.match(r"(?:\s*(?://[^\n]*\n|/\*.*?\*/[ \t]*\n))*", t, re.S)   # garder l'en-tête en commentaire
            pos = m.end() if m else 0
            if t.lstrip().startswith("#pragma once"):
                pos = t.find("\n", t.find("#pragma once")) + 1
        return {name: t[:pos] + add + t[pos:]}
    if kind == "replace_include":
        name, old, new = fix[1:]
        t = texts[name]
        return {name: re.sub(r"(#[ \t]*include[ \t]*[<\"])" + re.escape(old) + r"([>\"])", r"\g<1>" + new + r"\2", t, count=1)}
    if kind == "add_loop":
        name = fix[1]
        t = texts[name]
        return {name: t.rstrip("\n") + "\n\nvoid loop() {\n}\n"}
    if kind == "ledc":
        fname, plan = _ledc_plan(ctx)
        if not fname:
            return plan
        t = texts[fname]
        for a, b, rep in sorted(plan, reverse=True):
            t = t[:a] + rep + t[b:]
        return {fname: t}
    return "correction inconnue"


def _fix_rank(f: _F) -> tuple:
    k = f.fix[0]
    rank = {"ledc": 0, "replace_include": 1, "include": 2, "add_loop": 3}.get(k)
    if rank is None:   # insertions en tête de setup() : Serial.begin en dernier, donc tout en haut
        rank = 4 + f.fix[2] if k == "setup_insert" else 20
    return (rank, f.id)


def _atomic_write(root: Path, rel: str, text: str):
    p = root / rel
    if not _inside(root, p) or p.is_symlink():
        raise PermissionError(f"refus d'écrire {rel}")
    tmp = p.with_name(f".{p.name}.patricia.tmp")
    if tmp.is_symlink():
        tmp.unlink()
    with open(tmp, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)
    os.replace(tmp, p)


def _backup_root(root: Path) -> Path:
    b = root / BACKUP_DIR
    if b.is_symlink() or (b.exists() and not b.is_dir()):
        raise PermissionError(f"{BACKUP_DIR} n'est pas un dossier normal")
    return b


def _make_backup(root: Path, files: list[str]) -> str:
    broot = _backup_root(root)
    broot.mkdir(exist_ok=True)
    name = time.strftime("%Y%m%d-%H%M%S")
    dest = broot / name
    n = 1
    while dest.exists():
        n += 1
        dest = broot / f"{name}-{n}"
    dest.mkdir()
    copied = []
    for rel in files:
        src = root / rel
        if not _inside(root, src) or not src.is_file():
            continue
        d = dest / rel
        d.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, d, follow_symlinks=False)
        copied.append(rel)
    (dest / "manifest.json").write_text(json.dumps({"files": copied, "created": time.time()}, ensure_ascii=False), encoding="utf-8")
    return dest.relative_to(root).as_posix()


def apply_fixes(project_dir: Path, ids: list[str] | None = None, build_log: str = "", board: str | None = None) -> dict:
    """Applique les corrections automatiques (toutes si ids est None) après sauvegarde des fichiers."""
    root = _root(project_dir)
    b = _board_for(root, board)
    texts = _read_texts(root)
    original = dict(texts)
    findings = _analyze_texts(texts, b, build_log)
    by_id = {f.id: f for f in findings}
    skipped = []
    if ids is None:
        targets = [f for f in findings if f.fix]
    else:
        targets = []
        for i in dict.fromkeys(ids):
            f = by_id.get(i)
            if f is None:
                skipped.append({"id": i, "reason": "constat introuvable (déjà corrigé ?)"})
            elif not f.fix:
                skipped.append({"id": i, "reason": "pas de correction automatique sûre : " + (f.fix_summary or "à corriger à la main")})
            else:
                targets.append(f)
    if not targets:
        return {"applied": [], "skipped": skipped, "backup": None, "changed_files": []}
    backup = _make_backup(root, list(texts))
    applied = []
    for f in sorted(targets, key=_fix_rank):
        current = {x.id: x for x in _analyze_texts(texts, b, build_log)}
        cur = current.get(f.id)
        if cur is None:
            applied.append(f.id)           # résolu par une correction précédente
            continue
        res = _do_fix(texts, _Ctx(texts, b), cur.fix)
        if isinstance(res, str):
            skipped.append({"id": f.id, "reason": res})
            continue
        texts.update(res)
        applied.append(f.id)
    changed = [n for n in texts if texts[n] != original.get(n)]
    for n in changed:
        _atomic_write(root, n, texts[n])
    return {"applied": applied, "skipped": skipped, "backup": backup, "changed_files": changed}


def list_backups(project_dir: Path) -> list[str]:
    root = _root(project_dir)
    broot = _backup_root(root)
    if not broot.is_dir():
        return []
    return sorted(p.name for p in broot.iterdir() if p.is_dir() and not p.is_symlink() and (p / "manifest.json").is_file())


def restore_backup(project_dir: Path, backup_name: str | None = None) -> dict:
    """Remet en place les fichiers d'une sauvegarde (la plus récente par défaut)."""
    root = _root(project_dir)
    names = list_backups(root)
    if not names:
        return {"ok": False, "error": "aucune sauvegarde pour ce projet", "restored": None, "files": []}
    name = backup_name or names[-1]
    if name not in names:
        return {"ok": False, "error": f"sauvegarde inconnue : {name}", "restored": None, "files": []}
    src_dir = root / BACKUP_DIR / name
    try:
        files = json.loads((src_dir / "manifest.json").read_text(encoding="utf-8")).get("files", [])
    except (OSError, ValueError):
        return {"ok": False, "error": "manifeste illisible", "restored": None, "files": []}
    restored = []
    for rel in files:
        rel = str(rel)
        if Path(rel).suffix.lower() not in SOURCE_EXTS or Path(rel).is_absolute() or ".." in Path(rel).parts:
            continue
        src = src_dir / rel
        if not _inside(root, src) or not src.is_file():
            continue
        dest = root / rel
        if dest.parent != root and not _inside(root, dest.parent):
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        _atomic_write(root, rel, src.read_text(encoding="utf-8", errors="replace"))
        restored.append(rel)
    return {"ok": True, "restored": name, "files": restored, "backup": f"{BACKUP_DIR}/{name}"}
