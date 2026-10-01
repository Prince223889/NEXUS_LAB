"""Compréhension du français sans IA : Patricia reconnaît l'intention et les éléments utiles d'une phrase.

Les règles couvrent les demandes du labo (projets, notes, flash, pilotage, diagnostic…). Une phrase non
reconnue part vers l'IA si elle est configurée, sinon vers la recherche dans le catalogue et la mémoire.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .memory import fold

NUMBERS = {"un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10}
BOARD_WORDS = [("esp32s3", r"\b(s3|esp32[- ]?s3)\b"), ("esp32c3", r"\b(c3|esp32[- ]?c3)\b"), ("esp32", r"\besp32\b")]
JOB_WORDS = [("SYSTEM_TEST", r"check[- ]?up|bilan|diagnostic (des|du) worker|test systeme"), ("BENCHMARK", r"benchmark|perf"),
             ("MEM_TEST", r"test (de la )?memoire"), ("FS_TEST", r"test (du )?(systeme de )?fichiers"),
             ("WIFI_SCAN", r"scan(ne|ner)? (le )?wi-?fi|reseaux wi-?fi"), ("IDENTIFY", r"identifi|clignot|repere"),
             ("PING", r"\bping\b")]
DIRS = {"avance": (1, 0), "recule": (-1, 0), "gauche": (0.4, -1), "droite": (0.4, 1)}


@dataclass
class Intent:
    name: str
    confidence: float
    slots: dict = field(default_factory=dict)


def _num(s: str) -> int | None:
    s = s.strip()
    if s.isdigit():
        return int(s)
    return NUMBERS.get(s)


def workers_in(ft: str) -> list[int]:
    """« worker 3 », « voiture deux », « W4 », « les voitures 1, 2 et 5 »."""
    ids: list[int] = []
    for m in re.finditer(r"\b(?:workers?|voitures?|vehicules?|robots?|cartes?|w|v)\s*n?[°o]?\s*((?:\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)(?:\s*(?:,|et)\s*(?:\d+|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix))*)", ft):
        for part in re.split(r"\s*(?:,|et)\s*", m.group(1)):
            n = _num(part)
            if n and 1 <= n <= 10 and n not in ids:
                ids.append(n)
    return ids


def board_in(ft: str) -> str | None:
    for b, pat in BOARD_WORDS:
        if re.search(pat, ft):
            return b
    return None


LOG_MARKERS = re.compile(r"(error:|fatal error|Guru Meditation|Brownout|rst:0x|Backtrace:|Failed to connect|E \(\d+\)|\[E\]\[|panic|invalid header|Task watchdog|exit status \d)", re.I)


def detect(text: str) -> Intent:
    raw = str(text or "").strip()
    ft = fold(raw)
    words = len(ft.split())

    if LOG_MARKERS.search(raw) or (raw.count("\n") >= 3 and re.search(r"\berror|erreur|0x[0-9a-f]{6}", ft)):
        return Intent("diagnose", 0.95, {"log": raw})
    if re.search(r"\b(arret d.urgence|stop tout|arrete tout|arretez tout|stop stop|urgence)\b", ft) or ft in ("stop", "stop !", "arrete", "arrete !", "stop."):
        return Intent("estop", 1.0, {"workers": workers_in(ft)})
    if re.fullmatch(r"(bonjour|salut|coucou|hello|hey|bonsoir|yo)( patricia)?[ !.,]*", ft):
        return Intent("greet", 0.95)
    if re.fullmatch(r"(merci|super|parfait|top|genial|cool|ok merci)( patricia)?[ !.,]*", ft):
        return Intent("thanks", 0.9)
    if re.search(r"\b(que sais[- ]tu faire|tu peux faire quoi|aide[- ]moi a comprendre ce que tu|tes capacites|comment tu marches|aide$|^aide)\b", ft):
        return Intent("help", 0.9)

    m = re.match(r"^(?:patricia[, ]+)?(?:note|notes|prends note|ecris|retiens|rappelle[- ]toi|souviens[- ]toi|n.oublie pas|memorise)\s*(?:que|:|de|bien)?\s*(.+)", raw, re.I | re.S)
    if m and not re.match(r"^(?:mes notes|les notes)", ft):
        return Intent("note_add", 0.95, {"text": m.group(1).strip()})
    if re.search(r"\b(mes notes|les notes|montre.* notes|liste.* notes)\b", ft):
        return Intent("note_list", 0.9)
    m = re.search(r"\b(?:je m.appelle|appelle[- ]moi)\s+([\w-]{2,30})", raw, re.I)
    if m:
        return Intent("fact_set", 0.95, {"key": "prenom", "value": m.group(1)})
    m = re.search(r"\b(?:ma|mon) (carte|microcontroleur|board) (?:prefere[e]?|habituel(?:le)?) (?:est|c.est) (?:la |le |l.)?(.+)", ft)
    if m:
        return Intent("fact_set", 0.9, {"key": "carte preferee", "value": m.group(2).strip(" .")})
    m = re.search(r"\b(?:oublie|efface) (?:que |ce que )?(.+)", ft)
    if m and "note" not in ft:
        return Intent("forget", 0.7, {"text": m.group(1)})
    if re.search(r"\b(qu.est[- ]ce que tu (sais|te rappelles)|te souviens[- ]tu|tu te souviens|on avait (fait|dit)|rappelle[- ]moi|qu.ai[- ]je (dit|note))\b", ft):
        return Intent("recall", 0.85, {"query": raw})

    wids = workers_in(ft)
    if re.search(r"\b(flash|flashe|flasher|televerse|televerser|charge|installe|programme)\b", ft) and (wids or "worker" in ft or "voiture" in ft):
        m = re.search(r"(?:avec|le projet|projet|programme)\s+(?:le |la |l.|du |de la )?([\w -]{3,60}?)(?:\s+(?:sur|dans|pour)\b|$|[.?!])", ft)
        return Intent("flash", 0.9, {"workers": wids, "project": (m.group(1).strip() if m else ""), "board": board_in(ft)})
    if re.search(r"\b(verifie|controle|regarde)\b.*\b(marche|fonctionne|moniteur|serie|flash)", ft):
        return Intent("verify", 0.8, {"workers": wids})
    if re.search(r"\b(compile|compiler|build)\b", ft):
        m = re.search(r"(?:compile[r]?|build)\s+(?:le projet |le |la |l.)?([\w-]{3,60})", ft)
        return Intent("build", 0.85, {"project": m.group(1) if m else "", "board": board_in(ft)})
    if re.search(r"\b(apk|application android|appli(cation)? (mobile|telephone))\b", ft):
        return Intent("apk", 0.85, {"text": raw})

    drive_word = re.search(r"\b(avance|recule|tourne|pilote|conduis|deplace|va|vas|envoie|ramene|gare|garer)\b", ft)
    fleet_word = re.search(r"\b(voiture|voitures|vehicule|vehicules|robot|robots|flotte)\b", ft)
    formation_word = re.search(r"\b(en ligne|aligne|en cercle|en rond|a la base|au depart|en position)\b", ft)
    if (drive_word or formation_word) and (fleet_word or wids):
        slots: dict = {"workers": wids, "all": bool(re.search(r"\b(toutes|tous|flotte)\b", ft))}
        m = re.search(r"\b(?:en|a|au point|vers|position)\s*\(?\s*(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*\)?", ft)
        if m:
            slots["target"] = (float(m.group(1).replace(",", ".")), float(m.group(2).replace(",", ".")))
        m = re.search(r"\b(\d+(?:[.,]\d+)?)\s*(cm|m|metres?|centimetres?)\b", ft)
        if m:
            d = float(m.group(1).replace(",", "."))
            slots["distance_m"] = d / 100 if m.group(2).startswith("c") else d
        for word, vec in DIRS.items():
            if word in ft:
                slots["direction"] = word
        if re.search(r"\b(ligne|aligne)", ft):
            slots["formation"] = "ligne"
        elif re.search(r"\b(cercle|rond)", ft):
            slots["formation"] = "cercle"
        elif re.search(r"\b(ramene|maison|base|gare|garer|depart)", ft):
            slots["formation"] = "base"
        return Intent("drive", 0.85, slots)
    if fleet_word and re.search(r"\b(etat|ou sont|position|combien)\b", ft):
        return Intent("fleet_status", 0.85)

    for job, pat in JOB_WORDS:
        if re.search(r"\b(lance|fais|demarre|execute|faire)\b", ft) and re.search(pat, ft):
            return Intent("job", 0.9, {"job": job, "workers": wids})
    if re.search(r"\b(etat|statut|status|comment va|resume) (du |de la |des )?(labo|laboratoire|box|workers?|flotte|systeme)\b", ft) or ft in ("etat", "statut"):
        return Intent("status", 0.9)

    if (re.search(r"\b(lis|lire|donne|quelle?s?|combien|valeurs?|affiche|montre|indique|releve)\b", ft)
            and re.search(r"\b(capteurs?|mesures?|temperature|humidite|pression|lumiere|luminosite|co2|distance|niveau|valeurs?|fait[- ]il)\b", ft)
            and not re.search(r"\b(brancher|branche|cabl|montage|schema|code|programme|choisir|acheter)", ft)):
        m = re.search(r"\b(temperature|humidite|pression|lumiere|luminosite|co2|distance|niveau|gaz|sol|pluie|vent|courant|tension|poids)\b", ft)
        return Intent("sensors", 0.85, {"workers": wids, "topic": m.group(1) if m else ""})
    if re.search(r"\b(mes projets|liste.* projets|quels projets|nos projets)\b", ft):
        return Intent("project_list", 0.9)
    if re.search(r"\b(on reprend|reprenons|continue[rs]?|ou en (est|etait|etions)|on en etait)\b", ft):
        return Intent("project_resume", 0.85, {"text": raw})
    m = re.search(r"\b(?:projet|le|la)\s+(.{3,60}?)\s+(?:est|passe|devient)\s+(?:en\s+)?(termine|fini|en pause|pause|en test|test|essais|cablage|code|conception)\b", ft)
    if m:
        st = {"termine": "termine", "fini": "termine", "en pause": "pause", "pause": "pause", "en test": "test", "test": "test",
              "essais": "test", "cablage": "cablage", "code": "code", "conception": "conception"}[m.group(2)]
        return Intent("project_status", 0.85, {"project": m.group(1), "status": st})
    if re.search(r"\b(ameliore[rz]?|amelioration|optimise[rz]?|ajoute[rz]? (une|des) fonction|idees? pour)\b", ft):
        return Intent("improve", 0.8, {"text": raw})
    if re.search(r"\b(je (veux|voudrais|souhaite|vais)|on (va|pourrait)|aide[- ]moi a|j.aimerais) (faire|creer|construire|fabriquer|realiser|monter|concevoir)\b", ft) or re.search(r"\b(nouveau projet|cree[rz]? (un|une|le) projet)\b", ft):
        return Intent("project_new", 0.85, {"text": raw, "board": board_in(ft)})
    if re.search(r"\b(brancher|branche|cabler|cablage|montage|schema|brochage|connecter|relier)\b", ft):
        return Intent("wiring", 0.8, {"text": raw, "board": board_in(ft)})
    if re.search(r"\b(ecris|genere|donne)[- ]?(moi )?(le |un )?code\b", ft) or re.search(r"\bcode (pour|du|de)\b", ft):
        return Intent("code", 0.8, {"text": raw, "board": board_in(ft)})
    if re.search(r"\b(marche pas|fonctionne pas|bug|plante|erreur|redemarre|nan|ne repond|probleme|panne)\b", ft):
        return Intent("diagnose", 0.7, {"log": raw})
    if re.search(r"\b(conseil|recommande|lequel|quelle carte|quel capteur|choisir|mieux)\b", ft):
        return Intent("advice", 0.7, {"text": raw, "board": board_in(ft)})
    return Intent("question", 0.3 if words > 2 else 0.2, {"text": raw})
